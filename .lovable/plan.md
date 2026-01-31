
# Workout Tracking for Athletes

This plan implements the core workout logging functionality that allows athletes to track their daily training, providing data for both personal training journals and coach analytics.

---

## Summary

Athletes will be able to log workouts from both the Dashboard and Calendar views, recording:
- Completion status (none, partial, complete)
- RPE (1-10 scale)
- How they felt (quick-select options + custom text)
- Distance run (miles or km)
- Freeform notes

Coaches will have full visibility into all athlete logs and can log/edit on behalf of any athlete.

---

## Database Changes

### 1. Add distance_value column to workout_logs

The existing `workout_logs` table already has most fields needed. We need to add a column for athlete-logged distance:

```sql
ALTER TABLE public.workout_logs 
ADD COLUMN distance_value NUMERIC(6,2),
ADD COLUMN distance_unit TEXT DEFAULT 'miles' CHECK (distance_unit IN ('miles', 'km'));
```

### 2. Remove distance from scheduled_workouts

Per your request, remove the distance field from workout creation (coaches specify distances in the description/athlete_notes fields instead):

```sql
ALTER TABLE public.scheduled_workouts DROP COLUMN IF EXISTS distance;
```

### 3. Update existing RLS policies

The current `workout_logs` RLS policies already support:
- Athletes logging their own workouts
- Coaches logging for any team athlete

No changes needed to RLS.

---

## UI Components to Build

### 1. WorkoutLogDialog Component
**Purpose**: Modal dialog for logging a workout

**Fields**:
- Completion status: Radio buttons (Did Not Complete / Partial / Complete)
- RPE: Slider or number input (1-10)
- How Felt: Quick-select chips (Great, Strong, Average, Tired, Weak) + optional text
- Distance: Number input + unit toggle (mi/km)
- Notes: Textarea for freeform notes

**Behavior**:
- Pre-populates if editing existing log
- Shows workout details (title, type, date) at top
- Submit creates or updates workout_log record

### 2. Dashboard TodayWorkout Enhancement
**Current**: Shows workout info only
**Add**: "Log Workout" button for athletes that opens WorkoutLogDialog

### 3. Calendar Workout Click Enhancement
**Current**: Calendar shows workouts but no interaction for athletes
**Add**: Clicking a workout day opens WorkoutLogDialog for that workout

### 4. Athlete Training Journal View
**New component**: Display athlete's logged workouts in a list/timeline format
- Shows date, workout type, completion status, RPE, distance
- Expandable to see full notes
- Filterable by date range

---

## Hooks to Create

### useWorkoutLogs Hook
```typescript
// Fetch logs for a specific athlete
useAthleteWorkoutLogs(profileId, dateRange?)

// Fetch logs for a specific scheduled workout
useWorkoutLogsForScheduledWorkout(scheduledWorkoutId)

// Mutations
useCreateWorkoutLog()
useUpdateWorkoutLog()
useDeleteWorkoutLog()
```

---

## File Changes Overview

### New Files
| File | Purpose |
|------|---------|
| `src/components/workouts/WorkoutLogDialog.tsx` | Main logging modal |
| `src/components/workouts/FeelingSelector.tsx` | How-felt quick-select chips |
| `src/components/workouts/RPESlider.tsx` | RPE input with labels |
| `src/hooks/useWorkoutLogs.ts` | Data fetching/mutations |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/dashboard/TodayWorkout.tsx` | Add "Log Workout" button for athletes |
| `src/pages/Calendar.tsx` | Add workout click handler for athletes |
| `src/components/calendar/AddWorkoutDialog.tsx` | Remove distance field |
| `src/pages/AthleteDetail.tsx` | Add workout history section (coach view) |

---

## User Experience Flow

### Athlete Flow (Dashboard)
1. Athlete sees today's workout on Dashboard
2. Clicks "Log Workout" button
3. Dialog opens with workout title/type displayed
4. Athlete fills in: completion, RPE, how felt, distance, notes
5. Clicks Save
6. Toast confirms "Workout logged!"

### Athlete Flow (Calendar)
1. Athlete navigates to Calendar
2. Clicks on any past or current workout
3. Same dialog opens for that date
4. Can edit if already logged, or create new log

### Coach Flow
1. Coach views any athlete's detail page
2. Sees workout history with all logged data
3. Can click to log/edit on behalf of athlete

---

## Technical Considerations

### Feeling Options (Predefined)
```typescript
const FEELING_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '💪' },
  { value: 'strong', label: 'Strong', emoji: '😊' },
  { value: 'average', label: 'Average', emoji: '😐' },
  { value: 'tired', label: 'Tired', emoji: '😓' },
  { value: 'weak', label: 'Weak', emoji: '😫' },
] as const;
```

The `how_felt` field will store either a predefined value OR custom text (freeform takes precedence if provided).

### Distance Unit Conversion
Store distance_value as-is with unit. For analytics, we can normalize to a single unit when aggregating.

---

## Future Analytics Foundation

This logging data enables future features:
- Weekly mileage totals
- RPE trends over time
- Completion rate tracking
- Team-wide effort distribution
- Individual athlete training load graphs

These analytics features are not part of this implementation but the data structure supports them.
