# Bug Review and Root Cause Analysis

Last updated: 2026-02-08

## Summary

| ID | User-Reported Issue | Status | Priority |
|---|---|---|---|
| 1 | Logging out is not obvious on mobile | Fixed in this repo | Medium |
| 2 | SMS auth not working; possible duplicate phone issue | Fixed in Lovable (not re-verified locally) | High |
| 3 | Athlete detail page has horizontal scroll on mobile | Root cause identified | High |
| 4 | Dashboard stat panels should be tappable | Root cause identified | Medium |
| 5 | Attendance P/A/E/L buttons are unclear | Root cause identified | Medium |
| 6 | Team creation should lead to season creation; no-season behavior concerns | Root cause identified | High |
| 7 | Coaches cannot create off-season race results for athletes | Root cause identified | High |
| 8 | Multiple users can save the same phone number | Root cause identified | High |

## Detailed Findings

### 1) Mobile logout is not obvious
- Report: "Logging out is not obvious on mobile."
- Root cause:
  - Mobile nav does not expose a dedicated `Sign out` row.
  - Logout is nested inside `RoleSwitcher` dropdown, and the trigger label is hidden on small screens.
- Evidence:
  - `src/components/layout/AppLayout.tsx:111`
  - `src/components/RoleSwitcher.tsx:42`
  - `src/components/RoleSwitcher.tsx:64`
- Notes:
  - Functional but discoverability is poor on mobile.

### 2) SMS auth failure and duplicate-phone concern
- Report: "SMS auth isn't working... Is it possible two accounts share a phone and that caused failure?"
- Root cause A (high confidence): phone normalization mismatch.
  - Login normalizes SMS identifier to E.164 (`+1XXXXXXXXXX`), but profile phone is saved as raw user input.
  - SMS lookup compares digit strings exactly, so `5551234567` and `+15551234567` do not match.
- Root cause B (plausible): duplicate phone values are not constrained and lookup picks first match.
  - This can cause ambiguous or incorrect account resolution.
- Evidence:
  - `src/lib/phone.ts:19`
  - `src/hooks/useUpdateProfile.ts:26`
  - `src/pages/Signup.tsx:96`
  - `supabase/functions/send-otp/index.ts:71`
  - `supabase/functions/send-otp/index.ts:79`
  - `supabase/functions/verify-otp/index.ts:111`
  - `supabase/migrations/20260129202538_76d6af95-fff7-445a-ba96-64ba33c362ce.sql:2`
- Notes:
  - This is likely the largest reliability issue in the list.

### 3) Athlete detail mobile horizontal scrolling
- Report: "Athlete detail page as a coach is causing left/right scroll on mobile."
- Root cause:
  - Header card uses a single-row flex layout containing avatar, name block, and three action buttons.
  - On narrow screens this row overflows horizontally.
- Evidence:
  - `src/pages/AthleteDetail.tsx:110`
  - `src/pages/AthleteDetail.tsx:133`
- Notes:
  - Straightforward responsive layout fix.

### 4) Dashboard quick stats should navigate on tap
- Report: "Tapping athlete count, completed today, or team miles should take you places."
- Root cause:
  - Quick stat cards are currently display-only components with no click handlers or routing props.
- Evidence:
  - `src/components/dashboard/QuickStats.tsx:57`
- Notes:
  - Requires product mapping of destination routes per card.

### 5) Attendance status buttons are unclear
- Report: "P/A/E/L buttons are not obvious; need words."
- Root cause:
  - UI stores full labels in config but renders only short letters in action buttons.
- Evidence:
  - `src/pages/Attendance.tsx:23`
  - `src/pages/Attendance.tsx:330`
- Notes:
  - UX clarity issue with low implementation risk.

### 6) Team creation flow and no-season operation
- Report:
  - "Team creation should take you to season creation."
  - "Workouts/logs were created without a season; is that okay?"
- Root cause A:
  - Team creation success CTA goes to dashboard, not season setup.
- Root cause B:
  - Core create flows allow `season_id = null`, so app can operate outside an active season.
  - This does not necessarily lose records, but season-scoped views can be empty/inconsistent.
- Evidence:
  - `src/pages/CreateTeam.tsx:135`
  - `src/components/calendar/AddWorkoutDialog.tsx:99`
  - `src/hooks/useTeamAthletes.ts:27`
  - `src/hooks/useRecords.ts:87`
- Notes:
  - This is both onboarding UX and data-model policy decision.

### 7) Off-season race result creation missing athletes
- Report: "Coaches don't have ability to create off-season race results for athletes."
- Root cause:
  - Off-season result dialog fetches athletes filtered by active season, not full team roster.
  - Athletes outside current active season are hidden from selector.
- Evidence:
  - `src/components/records/AddOffseasonResultDialog.tsx:25`
  - `src/components/records/AddOffseasonResultDialog.tsx:29`
  - `src/hooks/useTeamAthletes.ts:27`
- Notes:
  - Data model supports off-season results; UI filtering blocks usage.

### 8) Multiple users can save the same phone number
- Report: "Multiple users can list the same phone number in their profile."
- Root cause:
  - `profiles.phone` is stored as plain text with no uniqueness constraint.
  - Profile update policy allows each user to write their own profile, but there is no DB-level guard preventing duplicates.
  - Signup/update paths write phone as raw user input, so duplicates can occur in mixed formats too.
- Evidence:
  - `supabase/migrations/20260129202538_76d6af95-fff7-445a-ba96-64ba33c362ce.sql:2`
  - `supabase/migrations/20260129171505_a65de54f-8f90-448d-b060-0b136fd33219.sql:267`
  - `src/hooks/useUpdateProfile.ts:26`
  - `src/pages/Signup.tsx:96`
- Notes:
  - This can cause ambiguous identity resolution for SMS login and account recovery flows.
  - Recommended direction: normalize phone to canonical E.164 and enforce uniqueness on the normalized value.

## Suggested Fix Order

1. Duplicate phone prevention (normalize + unique constraint).
2. Off-season result athlete filtering.
3. Athlete detail mobile overflow.
4. Team creation -> season onboarding flow.
5. Attendance status button wording.
6. Dashboard stat card navigation.
