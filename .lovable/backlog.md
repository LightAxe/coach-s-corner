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

## ~~5. Attendance Tracking~~ ✅

**Status:** Complete (v1)
**Owner:** Lovable (DB/migration) + Claude Code (UI + export)
**Priority:** Medium

Track who shows up to practice. Many schools require attendance reports from coaches.

### v1 Scope
- **Coach-only entry**, once per day per athlete
- **Four statuses:** Present / Absent / Excused / Late (enum)
- Optional note per athlete per day (e.g. "doctor's appointment")
- **Attendance page** (new route, coach-only nav item) with date picker defaulting to today
- Roster list with status toggle buttons (P/A/E/L) and optional note field
- "Mark all present" quick action
- Attendance data included in `export-data` Edge Function (all three roles)

### Remaining v1 work
- Attendance history view — past days in calendar or table format, click to view/edit
- Per-athlete attendance summary (rate, streaks) on athlete detail page or journal

### Out of Scope (v1)
- Athlete self check-in (GPS/QR)
- Multiple sessions per day
- Absence notifications

### Future Enhancement: Parent Daily Digest
Parent opt-in daily digest notification summarizing their athlete's attendance when marked as anything other than present (absent, excused, or late). Daily digest rather than instant alert — gives coaches time to correct mistakes before parents see them. Low technical cost (notification trigger on attendance insert) but should wait until the core attendance workflow is proven and coaches are actively using it.

---

## 6. Landing Page / Homepage

**Status:** Ready to build
**Owner:** Claude Code
**Priority:** High

Currently the app drops visitors straight into the signup/login flow with no context. Need a public landing page that explains what the app does, who it's for, and highlights key features before asking people to sign up.

### Requirements
- Public route (no auth required)
- Hero section with value proposition
- Feature highlights (calendar, workout logging, race results, attendance, etc.)
- Role-based benefits (coaches, athletes, parents)
- Clear CTA to sign up / log in
- Responsive design, consistent with app styling

### Open Questions
- Any testimonials or social proof to include?
- Screenshots/mockups of the app, or keep it text-based for now?

---

## 7. Attendance History & Athlete Summary

**Status:** Ready to build
**Owner:** Claude Code
**Priority:** Medium

Follow-up to attendance v1. Two pieces of remaining work:

### Requirements
- **History view** on the Attendance page — calendar or table showing past days with summary counts, click a day to view/edit that day's attendance
- **Per-athlete attendance summary** — attendance rate, current streak, and recent history visible on the athlete detail page or training journal

### Data Sources
- `useAttendanceRange` hook already exists for date-range queries
- Athlete detail page is at `src/pages/AthleteDetail.tsx`

---

## 8. Team Score Calculator + Lineup Modeling

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

## 9. Results Import

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

## 10. Coach Analytics Dashboard

**Status:** Needs discussion
**Owner:** TBD
**Priority:** Medium

Coaches need a centralized analytics view to understand how athletes are training, performing, and feeling over time. The data already exists across workout logs, race results, attendance, and ACWR — this feature surfaces it in one place with actionable insights.

### Possible Dimensions
- **Training volume:** weekly/monthly mileage trends per athlete and team-wide, volume distribution by workout type
- **Performance:** race time progression, PR tracking, pace trends across workouts
- **Wellness/effort:** perceived effort trends, completion status patterns (partial/missed workouts), ACWR risk flags
- **Attendance:** attendance rate trends, correlation with performance
- **Team-wide views:** aggregate dashboards, comparisons across athletes or training groups

### Open Questions
- Which metrics are most valuable to coaches day-to-day vs. for season planning?
- Individual athlete deep-dive vs. team-wide overview vs. both?
- How far back should trend data go — current season only, or cross-season?
- Are there specific visualizations coaches expect (charts, tables, heatmaps)?
- Should athletes see their own analytics, or coach-only?
- Do we need any new data collection (e.g. RPE/mood tracking on workout logs) to power wellness insights?
- How does this relate to the existing ACWR widget on athlete detail pages?

---

## 11. Mobile App

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

### ~~Attendance Tracking~~ ✅
Implemented (v1). `attendance` table with four-status enum (present/absent/excused/late). Coach-only Attendance page with date navigation, roster list with P/A/E/L toggle buttons, optional notes, and "Mark All Present" bulk action. Attendance data added to `export-data` Edge Function for all three roles (coach, athlete, parent). History view and per-athlete summary are remaining v1 items.
