# Coach's Corner — Feature Backlog

Prioritized list of feature enhancements. Items are worked on collaboratively between Claude Code (frontend/logic) and Lovable (DB migrations, Edge Functions, RLS).

---

## ~~1. Edit/Delete Personal Workouts~~ ✅

**Status:** Complete
**Owner:** Claude Code
**Priority:** High

Athletes can create personal workouts but can't fix mistakes or remove duplicates after submission.

### Requirements
- Add edit/delete buttons to `JournalEntry` component for personal workouts (`scheduled_workout_id === null`)
- Open `PersonalWorkoutDialog` in edit mode (pre-filled with existing data)
- Add `useUpdatePersonalWorkout` mutation to `useWorkoutLogs.ts`
- Delete with confirmation dialog

### Files to Modify
- `src/components/workouts/PersonalWorkoutDialog.tsx` — accept optional `existingLog` prop, edit mode
- `src/components/journal/JournalEntry.tsx` — add edit/delete buttons for personal workouts
- `src/hooks/useWorkoutLogs.ts` — add update mutation

### Design Notes
See `.lovable/plan.md` "Future Features" section for original spec.

---

## ~~2. Compliance Dashboard ("Who Logged Today?")~~ ✅

**Status:** Complete
**Owner:** Claude Code
**Priority:** High

Coaches need an at-a-glance view showing which athletes completed today's scheduled workout and who hasn't. This is checked multiple times daily.

### Requirements
- Grid/table of all team athletes with today's completion status
- Visual indicators: completed, partial, missed, not yet logged
- Quick access to log for an athlete (open log dialog)
- Filter by training group if groups are implemented
- Should be prominent on the coach dashboard or a dedicated view

### Data Sources
- `useTeamAthletes` for roster
- `useWorkoutLogs` or similar for today's completions
- `useScheduledWorkouts` for today's scheduled workout

---

## ~~3. Cumulative Season Mileage~~ ✅

**Status:** Complete
**Owner:** Claude Code
**Priority:** Medium

Show a running total of miles for the season on the dashboard and/or training journal. Athletes are motivated by seeing "I've run 847 miles this season."

### Requirements
- Sum all `distance_value` from workout logs within the active season date range
- Display on athlete dashboard as a stat card
- Optionally show on training journal header
- Consider a simple trend line or milestone markers (100, 250, 500, etc.)

### Data Sources
- `useAthleteWorkoutLogs` filtered to active season
- `useActiveSeason` for date boundaries

---

## ~~4. Calendar Export (iCal / Google Calendar)~~ ✅

**Status:** Complete
**Owner:** Claude Code (Edge Function + UI) + Lovable (DB migration)
**Priority:** Medium

Parents and athletes want the meet schedule and practice calendar in their phone's calendar app without manually entering dates.

### Requirements
- Generate an iCal (.ics) feed URL for the team's schedule
- Include races and scheduled workouts
- Subscribable URL (auto-updates when schedule changes)
- "Add to Calendar" button in the UI
- Consider: public vs. authenticated feed URL

### Implementation Approach
- Edge Function that generates iCal feed from `scheduled_workouts` + `races` tables
- Team-specific URL with a secret token for access
- UI button on Calendar page and/or Team Settings

---

## 5. Attendance Tracking

**Status:** Needs scoping
**Owner:** Both (Lovable for DB, Claude Code for UI)
**Priority:** Medium

Track who shows up to practice. Many schools require attendance reports from coaches.

### Requirements
- Daily attendance roster for coaches to mark present/absent
- Quick "mark all present" with individual toggles
- Attendance history and reporting (exportable)
- Absence notes/reasons (optional)

### Database Changes Needed
- New `attendance` table: `id`, `team_id`, `team_athlete_id`, `date`, `present` (boolean), `note`, `created_by`
- RLS: coaches can create/edit, athletes can view their own

### Open Questions
- Self check-in by athletes (GPS-based or QR code) or coach-only entry?
- Track by practice session or just by date?

---

## 6. Team Score Calculator + Lineup Modeling

**Status:** Needs discussion
**Owner:** TBD
**Priority:** Medium-Low

XC team scoring: sum of top 5 runners' finishing places. Coaches want "what-if" lineup scenario planning.

### Requirements
- Given race results, calculate team score automatically
- Lineup modeler: select 7 athletes, see projected team score based on recent times
- Compare lineups side-by-side
- Consider course-difficulty factors

### Open Questions
- How to handle multi-team meets (need opponent data)?
- Is this useful for dual meets only, or invitationals too?
- Should it predict places from times, or just work with actual results?
- Where does opponent data come from — manual entry? Results import?

---

## 7. Results Import

**Status:** Needs research
**Owner:** Both
**Priority:** Low

Bulk import race results from timing systems or Athletic.net instead of manual entry after every meet.

### Requirements
- CSV upload with column mapping (athlete name, time, place, distance)
- Fuzzy match athlete names to roster entries
- Preview + confirm before importing
- Handle edge cases: unknown athletes, duplicate results

### Open Questions
- Which timing systems / formats are most common? (FinishLynx, RunScore, chip timing CSV)
- Athletic.net API access — is there a public API or do we scrape?
- Is a standard CSV import sufficient as a starting point?

---

## 8. Mobile App

**Status:** Future / needs scoping
**Owner:** TBD
**Priority:** Low

Native iOS/Android app for quicker workout logging, push notifications, and better mobile experience.

### Requirements
- Core flows: log workout, view today's schedule, see race results
- Push notifications: new workout posted, meet reminder, PR celebration
- Offline support for logging (sync when back online)

### Open Questions
- React Native (code sharing with web) vs. native?
- PWA as an intermediate step before full native?
- Which platform first — iOS or Android?
- App Store review/approval timeline considerations

---

## Completed Items

### ~~Security: Separate Coach Invite Codes~~ ✅
Implemented. Teams have separate `join_code` (athletes) and `coach_invite_code` (coaches). Role determined by code used, not profile. See migration `20260131225806` and `src/pages/JoinTeam.tsx`.

### ~~Open Records/Leaderboard to Athletes~~ ✅
Implemented. Nav updated to show Records for athletes. PR progression added to Training Journal Races tab. RLS policy added for team_athletes visibility.

### ~~Edit/Delete Personal Workouts~~ ✅
Implemented. `PersonalWorkoutDialog` supports edit mode via `existingLog` prop. `JournalEntry` now renders personal workouts with edit/delete buttons and "Personal" badge. Date filtering fixed to include personal workouts. Added `useUpdatePersonalWorkout` hook.

### ~~Compliance Dashboard~~ ✅
Implemented. `WorkoutCompliance` component on coach dashboard shows color-coded athlete grid with completion status for today's scheduled workout. Sorted by status (not logged first).

### ~~Cumulative Season Mileage~~ ✅
Implemented. `useSeasonMileage` hook sums scheduled + personal workout distances within the active season. Displayed as highlighted stat card in Training Journal workouts tab.

### ~~Calendar Export (iCal)~~ ✅
Implemented. `calendar-feed` Edge Function serves iCal feed via token-based auth (`calendar_feed_token` on `teams` table). Subscribe dialog on Calendar page with content type picker (races/workouts/all), copy URL, and quick-add links for Google Calendar and Apple Calendar.
