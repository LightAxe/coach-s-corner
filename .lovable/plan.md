

# Implementation: Shell Athletes & Coach Workout Logging

## Overview

This implementation enables coaches to manage athletes who may never use the app, while still tracking their workout data. The core concept is a `team_athletes` table with an optional `profile_id` that is NULL for "shell" athletes (no app account) and populated when linked to a real user.

## Database Changes

### 1. Create `team_athletes` Table

```sql
CREATE TABLE public.team_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_team_profile UNIQUE (team_id, profile_id)
);
```

**Key design:**
- `profile_id = NULL` → Shell athlete (not in app)
- `profile_id = uuid` → Linked athlete (has app account)

### 2. Create Completion Status Enum

```sql
CREATE TYPE public.completion_status AS ENUM ('none', 'partial', 'complete');
```

### 3. Update `workout_logs` Table

```sql
ALTER TABLE public.workout_logs
  ADD COLUMN team_athlete_id UUID REFERENCES public.team_athletes(id),
  ADD COLUMN completion_status public.completion_status DEFAULT 'complete',
  ADD COLUMN logged_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.workout_logs
  ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.workout_logs
  ADD CONSTRAINT workout_logs_athlete_reference 
  CHECK (profile_id IS NOT NULL OR team_athlete_id IS NOT NULL);
```

### 4. RLS Policies

**For `team_athletes`:**
- Coaches can SELECT, INSERT, UPDATE, DELETE their team's athletes
- Athletes can SELECT their own record (when linked)

**For `workout_logs`:**
- Coaches can INSERT/UPDATE/DELETE logs for team_athletes they manage
- Existing athlete self-logging policies remain unchanged

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTeamAthletes.ts` | React Query hooks for CRUD operations |
| `src/components/athletes/AddAthleteDialog.tsx` | Form to add shell athlete |
| `src/components/athletes/LinkAthleteDialog.tsx` | Link real account to shell |
| `src/components/workouts/WorkoutLogForm.tsx` | Coach logging form |
| `src/pages/AthleteDetail.tsx` | Individual athlete view |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add TeamAthlete, CompletionStatus types |
| `src/pages/Athletes.tsx` | Use team_athletes, add "Add Athlete" button |
| `src/pages/JoinTeam.tsx` | Prompt to link after joining |
| `src/App.tsx` | Add `/athletes/:id` route |

## Type Definitions

```typescript
// Team athlete (shell or linked)
export type TeamAthlete = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  profile_id: string | null; // null = shell athlete
  created_by: string;
  created_at: string;
};

// Completion status for workout logs
export type CompletionStatus = 'none' | 'partial' | 'complete';
```

## React Query Hooks

```typescript
// Fetch all team athletes (shell + linked)
export function useTeamAthletes(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-athletes', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_athletes')
        .select('*')
        .eq('team_id', teamId)
        .order('last_name');
      if (error) throw error;
      return data as TeamAthlete[];
    },
    enabled: !!teamId,
  });
}

// Create a shell athlete
export function useCreateTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { 
      team_id: string; 
      first_name: string; 
      last_name: string;
      created_by: string;
    }) => {
      const { data: athlete, error } = await supabase
        .from('team_athletes')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return athlete;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}

// Link a profile to a team athlete
export function useUpdateTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, team_id, profile_id }: { 
      id: string;
      team_id: string;
      profile_id: string;
    }) => {
      const { data, error } = await supabase
        .from('team_athletes')
        .update({ profile_id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}
```

## UI Components

### Add Athlete Dialog
Simple form with first name and last name fields. Creates a shell athlete (profile_id = NULL).

### Link Athlete Dialog
Shows when a real athlete joins via team code. Allows coach to link them to an existing shell athlete, transferring all workout history.

### Updated Athletes Page
- Shows all team_athletes (both shell and linked)
- Shell athletes have "Not in app" badge
- Linked athletes show their profile info
- "Add Athlete" button for coaches
- Click to view athlete detail

### Workout Log Form (Coach View)
When viewing a workout, coaches see all team athletes with:
- Completion status dropdown (None / Partial / Complete)
- RPE slider (1-10)
- Notes field
- Can save for any athlete

## Implementation Order

1. **Database migration** - Create table and update columns
2. **Update types** - Add TypeScript interfaces
3. **Create hooks** - CRUD operations for team_athletes
4. **Add Athlete Dialog** - Create shell athletes
5. **Update Athletes page** - Use new data source
6. **Athlete Detail page** - View individual athlete
7. **Workout Log Form** - Coach logging interface
8. **Link Athlete Dialog** - Connect accounts
9. **Update JoinTeam** - Prompt for linking

