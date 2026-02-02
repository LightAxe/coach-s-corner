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
- `src/pages/TrainingJournal.tsx` - Added "Add Entry" button for athletes
- `src/pages/Calendar.tsx` - Athletes can click empty days to add personal workouts

---

# Future Features (Require Additional Work)

## Coach Visibility for Personal Workouts

### Problem
Coaches can see personal workouts reflected in ACWR calculations and weekly mileage stats, but they have no direct visibility into what personal workouts athletes have logged. This makes it hard to:
- Understand why an athlete's ACWR changed unexpectedly
- See if athletes are doing extra work outside the training plan
- Have informed conversations about total training load

### Proposed Solution

**Option A: Personal Workouts Tab on Athlete Detail Page**
- Add a "Personal Workouts" section or tab on the athlete detail page
- Shows list of personal workouts logged by the athlete
- Read-only for coaches (athletes own their personal data)

**Option B: Visual Indicator on Calendar**
- Show personal workouts on the calendar with a different style (e.g., dotted border, different icon)
- Coaches see "Personal: 5mi easy" on days where athletes logged personal workouts
- Requires fetching personal workout logs for the team

**Option C: Activity Feed**
- Add an activity feed showing recent personal workout submissions
- "John logged a personal workout: 6mi easy run on Jan 15"
- Could be on coach dashboard or athlete detail page

### Recommended Approach
Option A is simplest - add a collapsible section on AthleteDetail page that shows personal workouts. This keeps the data in context with the athlete's profile.

---

## Edit/Delete Personal Workouts

### Problem
Athletes can create personal workouts but cannot edit or delete them after submission. This is needed for:
- Fixing typos or incorrect data entry
- Removing duplicate entries
- Updating workout details after the fact

### Proposed Solution

**Database:** No changes needed - `useDeleteWorkoutLog` hook already exists and works for personal workouts.

**Frontend Changes:**

1. **Training Journal Integration**
   - Add edit/delete buttons to JournalEntry component for personal workouts
   - Personal workouts can be identified by `scheduled_workout_id === null`
   - Opens PersonalWorkoutDialog in edit mode (pre-filled with existing data)

2. **PersonalWorkoutDialog Edit Mode**
   - Accept optional `existingLog` prop
   - Pre-fill form with existing values when editing
   - Change submit button to "Save Changes"
   - Add delete button with confirmation dialog

3. **Hook Updates**
   - Add `useUpdatePersonalWorkout` mutation to `useWorkoutLogs.ts`
   - Similar to existing `useUpdateWorkoutLog` but for personal workout fields

### Files to Modify
- `src/components/workouts/PersonalWorkoutDialog.tsx` - Add edit mode support
- `src/components/journal/JournalEntry.tsx` - Add edit/delete buttons for personal workouts
- `src/hooks/useWorkoutLogs.ts` - Add update mutation for personal workouts
