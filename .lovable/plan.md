
# Updated Plan: Cleanup and Unified Distances

## Summary of Changes

Based on my code review, I'm adding the following cleanup tasks to the plan:

---

## Part 1: Dead Code / Unused Database Objects

### Tables to Drop

| Table | Reason |
|-------|--------|
| `prs` | Being replaced by unified `race_results` table |
| `team_distances` | Replaced by global `distances` table |

### Files to Delete

| File | Reason |
|------|--------|
| `src/lib/mock-data.ts` | Not imported anywhere - legacy mock data from before Supabase integration |
| `src/pages/Workouts.tsx` | Removing Workouts feature per plan |
| `src/hooks/usePRs.ts` | Will be replaced by new `useRecords.ts` hook |
| `src/components/prs/AddPRDialog.tsx` | Will be replaced by new race results components |
| `src/pages/PRBoard.tsx` | Will be rewritten as Records page |

### Files to Refactor

| File | Changes Needed |
|------|----------------|
| `src/hooks/useDistances.ts` | Complete rewrite - remove `team_distances` references, simplify to just fetch from global `distances` table |
| `src/hooks/useDashboardData.ts` | Remove `useWorkoutTemplates` hook (lines 196-206) |
| `src/lib/types.ts` | Remove `distanceLabels` (unused empty object), remove `PR` type, add new `Race`, `RaceResult`, `Distance` types |

### Code to Remove

| Location | What to Remove |
|----------|----------------|
| `src/hooks/useDistances.ts` | `PRESET_DISTANCES` constant, `useTeamDistances`, `useCreateDistance`, `useDeleteDistance`, `useInitializePresetDistances` - all reference `team_distances` |
| `src/hooks/useDistances.ts` | `useDistancesWithPRs` - queries `prs` table which will be dropped |
| `src/hooks/useScheduledWorkouts.ts` | `useScheduleFromTemplate` function (lines 63-80) - references templates |
| `src/lib/types.ts` | `PR` type and `PRWithAthlete` type - will be replaced |
| `src/lib/types.ts` | `distanceLabels` empty object - unused |

---

## Part 2: Revised Data Model

### Global `distances` Table (replaces `team_distances`)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Display name (unique) |
| sort_order | integer | For consistent UI ordering |
| created_at | timestamptz | Auto-generated |

**Seed data:**
```sql
INSERT INTO distances (name, sort_order) VALUES
  ('1500m', 0),
  ('Mile', 1),
  ('3000m', 2),
  ('2 Mile', 3),
  ('5K', 4);
```

**RLS:** Public read, no write via API (SQL-managed for MVP)

### `races` Table
Same as before but with `distance_id` FK:
```sql
CREATE TABLE races (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id UUID REFERENCES seasons(id),
  name TEXT NOT NULL,
  race_date DATE NOT NULL,
  distance_id UUID NOT NULL REFERENCES distances(id),
  location TEXT,
  details TEXT,
  transportation_info TEXT,
  map_link TEXT,
  results_link TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `race_results` Table (unified)
Same as before but with `distance_id` FK for offseason entries:
```sql
CREATE TABLE race_results (
  id UUID PRIMARY KEY,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  team_athlete_id UUID NOT NULL REFERENCES team_athletes(id),
  time_seconds NUMERIC(10,2) NOT NULL,
  place INTEGER,
  distance_id UUID REFERENCES distances(id),  -- for offseason entries
  achieved_at DATE,  -- for offseason entries
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT offseason_requires_distance_date 
    CHECK (race_id IS NOT NULL OR (distance_id IS NOT NULL AND achieved_at IS NOT NULL))
);
```

---

## Part 3: Full Database Migration

```sql
-- 1. Create global distances table
CREATE TABLE public.distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed distances
INSERT INTO public.distances (name, sort_order) VALUES
  ('1500m', 0),
  ('Mile', 1),
  ('3000m', 2),
  ('2 Mile', 3),
  ('5K', 4);

-- RLS: public read only
ALTER TABLE public.distances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view distances"
  ON public.distances FOR SELECT USING (true);

-- 2. Create races table
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  race_date DATE NOT NULL,
  distance_id UUID NOT NULL REFERENCES public.distances(id),
  location TEXT,
  details TEXT,
  transportation_info TEXT,
  map_link TEXT,
  results_link TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view races"
  ON public.races FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Coaches can create races"
  ON public.races FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update races"
  ON public.races FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete races"
  ON public.races FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- 3. Create unified race_results table
CREATE TABLE public.race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES public.races(id) ON DELETE CASCADE,
  team_athlete_id UUID NOT NULL REFERENCES public.team_athletes(id) ON DELETE CASCADE,
  time_seconds NUMERIC(10,2) NOT NULL,
  place INTEGER,
  distance_id UUID REFERENCES public.distances(id),
  achieved_at DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_race_athlete UNIQUE (race_id, team_athlete_id),
  CONSTRAINT offseason_requires_distance_date 
    CHECK (race_id IS NOT NULL OR (distance_id IS NOT NULL AND achieved_at IS NOT NULL))
);

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View results for team athletes"
  ON public.race_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_member(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can insert results"
  ON public.race_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can update results"
  ON public.race_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can delete results"
  ON public.race_results FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

-- 4. Drop old tables
DROP TABLE IF EXISTS public.prs;
DROP TABLE IF EXISTS public.team_distances;
```

---

## Part 4: Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useRaces.ts` | CRUD for races |
| `src/hooks/useRaceResults.ts` | Enter/view race results |
| `src/hooks/useRecords.ts` | Compute PRs and SRs from race_results |
| `src/components/races/AddRaceDialog.tsx` | Create race form |
| `src/components/races/RaceResultsForm.tsx` | Enter results for athletes |
| `src/components/races/RaceCard.tsx` | Calendar display |
| `src/components/records/AddOffseasonResultDialog.tsx` | Manual result entry |
| `src/pages/Records.tsx` | Replaces PRBoard with unified view |
| `src/pages/Races.tsx` | List of all races |

### Files to Delete

| File | Reason |
|------|--------|
| `src/lib/mock-data.ts` | Unused - no imports found |
| `src/pages/Workouts.tsx` | Removing Workouts nav |
| `src/hooks/usePRs.ts` | Replaced by useRecords.ts |
| `src/components/prs/AddPRDialog.tsx` | Replaced by new components |
| `src/pages/PRBoard.tsx` | Replaced by Records.tsx |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Remove Workouts route, update /prs to /records |
| `src/components/layout/AppLayout.tsx` | Remove Workouts nav, rename "PR Board" to "Records", add "Races" nav |
| `src/components/calendar/AddWorkoutDialog.tsx` | Remove template tab entirely |
| `src/pages/Calendar.tsx` | Add race type, display races |
| `src/hooks/useDistances.ts` | Complete rewrite - just fetch from global `distances` table |
| `src/hooks/useDashboardData.ts` | Remove useWorkoutTemplates if no longer needed |
| `src/lib/types.ts` | Update types for new schema |

---

## Part 5: Implementation Order

1. **Database migration** - Create new tables, drop old ones
2. **Delete dead code** - Remove unused files
3. **Rewrite useDistances.ts** - Simple global distances fetch
4. **Update navigation** - Remove Workouts, add Races, rename PRs to Records
5. **Remove template tab** - Simplify AddWorkoutDialog
6. **Create race hooks** - useRaces.ts, useRaceResults.ts
7. **Create race components** - AddRaceDialog, RaceCard
8. **Integrate races into calendar**
9. **Create useRecords.ts** - Unified PR/SR logic
10. **Create Records page** - Replace PRBoard
11. **Add offseason result entry**

---

## Summary

This cleanup removes:
- 2 database tables (`prs`, `team_distances`)
- 5+ files of dead/replaced code
- Simplifies the data model with a single global `distances` table
- Removes the unused template system from calendar

And adds:
- 1 new table (`distances`) with 5 preset values
- 2 new tables (`races`, `race_results`) for the races feature
- Unified PR/SR calculation from a single `race_results` table
