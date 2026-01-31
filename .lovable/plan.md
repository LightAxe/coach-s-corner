# XC Training Hub - Implementation Plan

## Completed Features

### ✅ Shell Athletes & Coach Workout Logging
- `team_athletes` table with optional `profile_id` for linking to real accounts
- Coaches can create shell athletes and log workouts for them
- Workout logs support `completion_status` (none/partial/complete)
- Shell athletes can be linked to real accounts later

### ✅ Seasons System
- `seasons` table with `is_active` flag (only one active per team)
- Season selector in sidebar for coaches to switch active season
- Athletes are tied to seasons (rosters can differ per season)
- Workouts and PRs can be associated with seasons

### ✅ Calendar Workout Management
- Add Workout dialog with two modes:
  - **Ad-hoc**: Create workout directly with all fields
  - **From Template**: Select from workout library
- Click calendar day to add workout for that date
- Athlete scaling notes field for per-skill-level guidance

### ✅ PR/SR Tracking
- PRs page shows all-time Personal Records
- Toggle to view Season Records (current season only)
- Leaderboard by distance with proper ranking
- Support for shell athletes in PR display

## Database Schema

### New Tables
- `seasons` - Team seasons with is_active flag
- `team_athletes` - Athletes (shell or linked) per team/season

### Modified Tables
- `scheduled_workouts` - Added `season_id`, `athlete_notes`
- `workout_templates` - Added `athlete_notes`
- `prs` - Added `season_id`, `team_athlete_id`, made `profile_id` nullable
- `workout_logs` - Added `team_athlete_id`, `completion_status`, `logged_by`

## Next Steps

### Features to Implement
1. **Workout Detail View** - Click workout to see full details and athlete notes
2. **Add PR Dialog** - Form to record new PRs for athletes
3. **Bulk Athlete Import** - CSV upload for adding multiple athletes
4. **Team Settings** - Manage team name, join code, seasons
5. **Notifications/Announcements** - Coach can post updates

### Multi-Team Support
- UI already supports multiple teams via `teamMemberships`
- Add team switcher in sidebar (similar to season switcher)
- Ensure all queries filter by `currentTeam.id`

## Architecture Notes

### Season Filtering
- Athletes page filters by active season
- Calendar can optionally filter by season
- PRs distinguish between all-time (no season filter) and SRs (season filter)

### Shell Athletes
- `team_athletes.profile_id = NULL` means shell athlete
- When real user joins and links, their `profile_id` gets set
- Historical workout logs remain tied to `team_athlete_id`
