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

# Future Features (Require Database Changes)

## Personal/Historical Workout Logging

### Problem
Athletes can only log workouts that coaches have scheduled. They cannot:
- Add runs that weren't on the schedule
- Log summer training, personal runs, or cross-training
- Backfill historical data to build ACWR history faster

This limits the accuracy of ACWR (Acute:Chronic Workload Ratio) calculations for new athletes or during off-season.

### Proposed Solution

**Database Changes:**
```sql
-- Allow workout_logs without a scheduled workout
ALTER TABLE workout_logs
  ALTER COLUMN scheduled_workout_id DROP NOT NULL;

-- Add date field for unscheduled workouts
ALTER TABLE workout_logs
  ADD COLUMN workout_date DATE;

-- Add constraint: must have either scheduled_workout_id OR workout_date
ALTER TABLE workout_logs
  ADD CONSTRAINT workout_date_or_scheduled CHECK (
    scheduled_workout_id IS NOT NULL OR workout_date IS NOT NULL
  );
```

**Frontend Changes:**
1. Add "Log Personal Workout" button to athlete dashboard/calendar
2. Create `PersonalWorkoutDialog` component with:
   - Date picker (can select past dates)
   - Distance input (miles/km)
   - RPE slider (1-10)
   - Optional notes
   - Workout type dropdown (easy run, long run, tempo, etc.)
3. Update `useACWR` and `useTeamAthleteStats` hooks to include personal workouts in calculations

**UI Location:**
- Athlete Dashboard: "Add Workout" floating action button or card
- Calendar view: Click on empty day to add personal workout
- Training Journal: "Add Entry" button

### Benefits
- More accurate ACWR for new athletes (can backfill 4 weeks of history)
- Captures off-season and supplemental training
- Complete picture of training load for injury prevention
