
# Plan: Connect Dashboard to Real Database Data

## Overview

The Dashboard and related pages currently display hardcoded mock data. This plan will update them to fetch and display real data from your database, with proper loading states and empty state messaging.

## Current Situation

- Dashboard shows static mock data (workouts, announcements, stats)
- Database tables exist but contain no workout/announcement data yet
- Real data will appear once coaches start creating workouts and announcements

## What We'll Build

### 1. Database Schema Update

Add a `priority` column to the `announcements` table to support "normal" vs "important" announcements:

```sql
ALTER TABLE announcements 
ADD COLUMN priority text DEFAULT 'normal' 
CHECK (priority IN ('normal', 'important'));
```

### 2. Data Fetching Hooks

Create custom React Query hooks to fetch data from the database:

**New file: `src/hooks/useDashboardData.ts`**
- `useScheduledWorkouts(teamId)` - Fetches this week's workouts for a team
- `useAnnouncements(teamId)` - Fetches recent announcements
- `useTeamStats(teamId)` - Fetches athlete count and completion stats
- `useTodayWorkout(teamId)` - Gets today's workout

### 3. Type Definitions

Create proper TypeScript types that bridge database schema with UI components:

**Update: `src/lib/types.ts`** (new file)
- Define `ScheduledWorkout`, `Announcement`, `WorkoutLog` types
- Keep helper functions like `getWorkoutTypeBadgeClass` for styling

### 4. Dashboard Component Updates

**Update: `src/pages/Dashboard.tsx`**
- Replace mock data imports with React Query hooks
- Add loading skeleton states
- Show helpful empty states when no data exists
- Use `currentTeam` from AuthContext to filter data

**Update: `src/components/dashboard/QuickStats.tsx`**
- Accept loading state prop
- Show skeleton while fetching

**Update: `src/components/dashboard/TodayWorkout.tsx`**
- Update to use database types instead of mock types
- Handle loading state

**Update: `src/components/dashboard/WeekPreview.tsx`**
- Update to use database types
- Show "No workouts scheduled" when empty

**Update: `src/components/dashboard/AnnouncementCard.tsx`**
- Update to use database types
- Already handles empty state (returns null)

### 5. Calendar Page Update

**Update: `src/pages/Calendar.tsx`**
- Fetch scheduled workouts from database for the visible week
- Replace mock data with real queries

### 6. Athletes Page Update

**Update: `src/pages/Athletes.tsx`**
- Fetch team members from `team_memberships` joined with `profiles`
- Show real athletes on the team roster

### 7. Workouts Library Page Update

**Update: `src/pages/Workouts.tsx`**
- Fetch from `workout_templates` table
- Allow coaches to create reusable templates

## Data Flow

```text
User logs in
    |
    v
AuthContext loads profile + team memberships
    |
    v
currentTeam is set (first team user belongs to)
    |
    v
Dashboard fetches data filtered by currentTeam.id
    |
    +--> scheduled_workouts (this week)
    +--> announcements (recent)
    +--> team_memberships count (athletes)
    +--> workout_logs (today's completions)
```

## Empty State Experience

When a coach first creates a team, they'll see:
- "No workout scheduled for today" in the Today's Workout card
- Empty week preview with "Schedule your first workout" prompt
- No announcements section (hidden when empty)
- Stats showing "0 Athletes, 0 Completed Today"

This encourages them to start adding content.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types.ts` | Create | Database-aligned type definitions |
| `src/hooks/useDashboardData.ts` | Create | React Query hooks for dashboard data |
| `src/pages/Dashboard.tsx` | Modify | Use real data hooks |
| `src/components/dashboard/TodayWorkout.tsx` | Modify | Use database types |
| `src/components/dashboard/WeekPreview.tsx` | Modify | Use database types, add empty state |
| `src/components/dashboard/AnnouncementCard.tsx` | Modify | Use database types |
| `src/components/dashboard/QuickStats.tsx` | Modify | Add loading state |
| `src/pages/Calendar.tsx` | Modify | Fetch real workouts |
| `src/pages/Athletes.tsx` | Modify | Fetch real team members |
| `src/pages/Workouts.tsx` | Modify | Fetch workout templates |
| Database migration | Create | Add priority column to announcements |

## Technical Details

### Database Query Examples

**Fetch this week's workouts:**
```typescript
const { data } = await supabase
  .from('scheduled_workouts')
  .select('*')
  .eq('team_id', teamId)
  .gte('scheduled_date', startOfWeek)
  .lte('scheduled_date', endOfWeek)
  .order('scheduled_date');
```

**Fetch team athletes:**
```typescript
const { data } = await supabase
  .from('team_memberships')
  .select('*, profiles(*)')
  .eq('team_id', teamId)
  .eq('role', 'athlete');
```

### React Query Pattern
```typescript
export function useScheduledWorkouts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-workouts', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      // ... fetch logic
    },
    enabled: !!teamId,
  });
}
```

## What Will Remain Unchanged

- `src/lib/mock-data.ts` - Kept for reference but no longer imported
- Component styling and layout
- RLS policies (already properly configured)

## Next Steps After Implementation

1. Test the dashboard loads without errors
2. Verify empty states display correctly
3. Create a test workout to see it appear on the calendar/dashboard
4. Create a test announcement to verify it displays
