# Announcements Management for Coaches

## ✅ IMPLEMENTED

Full CRUD functionality for team announcements has been implemented.

### Files Created
1. `src/hooks/useAnnouncements.ts` - CRUD hook with useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement
2. `src/components/announcements/CreateAnnouncementDialog.tsx` - Create dialog with form validation
3. `src/components/announcements/EditAnnouncementDialog.tsx` - Edit dialog with pre-filled values
4. `src/components/announcements/DeleteAnnouncementDialog.tsx` - AlertDialog confirmation

### Files Modified
1. `src/components/dashboard/AnnouncementCard.tsx` - Added isCoach prop, management buttons, empty state
2. `src/pages/Dashboard.tsx` - Passes isCoach prop, imports from new hook file

### Features
- Coaches can create, edit, and delete announcements from the dashboard
- "New" button in header opens create dialog
- Edit/delete buttons on each announcement (coach only)
- Important announcements highlighted with accent styling
- Empty state with helpful prompt for coaches
- Form validation (title required, max 100 chars; content optional, max 2000 chars)
- Priority selection (Normal/Important)

---

# ✅ Personal/Historical Workout Logging - IMPLEMENTED

## Overview
Athletes can now log personal workouts that aren't on the coach's schedule. This enables:
- Logging summer training, personal runs, or cross-training
- Backfilling historical data to build ACWR history faster
- More accurate ACWR calculations for new athletes

## Database Changes
- `workout_logs.scheduled_workout_id` is now nullable
- Added `workout_logs.workout_date` (DATE) for unscheduled workouts
- Added `workout_logs.workout_type` for personal workout categorization
- Updated RLS policies to allow personal workout creation

## Frontend Changes
1. **PersonalWorkoutDialog** (`src/components/workouts/PersonalWorkoutDialog.tsx`):
   - Date picker (past 60 days)
   - Workout type dropdown (Easy, Tempo, Interval, Long, Race, Other)
   - Distance input with miles/km toggle
   - RPE slider (1-10)
   - "How did you feel?" selector
   - Notes textarea

2. **Dashboard Integration** (`src/components/dashboard/TodayWorkout.tsx`):
   - "Log Personal Workout" button when no scheduled workout
   - "+" button next to regular log button for alternative workouts

3. **ACWR Calculations** (Updated hooks):
   - `useACWR.ts` - Now includes personal workouts in training load calculations
   - `useTeamAthleteStats.ts` - Includes personal workouts in weekly miles and ACWR

## Files Created
- `src/components/workouts/PersonalWorkoutDialog.tsx`

## Files Modified
- `src/hooks/useWorkoutLogs.ts` - Added `useCreatePersonalWorkout`, `usePersonalWorkoutLogs`
- `src/hooks/useACWR.ts` - Fetches both scheduled and personal logs
- `src/hooks/useTeamAthleteStats.ts` - Includes personal logs in stats
- `src/components/dashboard/TodayWorkout.tsx` - Added personal workout button
