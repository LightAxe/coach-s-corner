# Onboarding Security & Workflow Fixes

This plan addresses a critical privilege escalation vulnerability and gaps in the team onboarding workflow.

---

## Security Vulnerability (CRITICAL)

### Problem
Users self-select their role during signup, and the system trusts this role when joining teams. A bad actor with a leaked join code can:
1. Sign up claiming to be a "coach"
2. Use the athlete join code
3. Gain full coach access to the team (view all athletes, modify workouts, etc.)

### Solution: Separate Join Codes for Coaches vs Athletes

**Approach**: Teams will have TWO codes:
- `athlete_join_code` - For athletes/parents to join
- `coach_invite_code` - For additional coaches (optional, generated on-demand)

**Key Change**: When joining, the system determines role from the CODE USED, not the user's profile role.

```sql
-- Add coach_invite_code column to teams
ALTER TABLE public.teams 
ADD COLUMN coach_invite_code TEXT UNIQUE;

-- Function to generate codes
CREATE OR REPLACE FUNCTION generate_join_code() 
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substr(md5(random()::text), 1, 6));
END;
$$ LANGUAGE plpgsql;
```

**Join Logic Change**:
```typescript
// Current (VULNERABLE):
role: profile.role === 'coach' ? 'coach' : 'athlete'

// Fixed:
// If code matches coach_invite_code → join as coach
// If code matches join_code → join as athlete (regardless of profile.role)
```

---

## Workflow Gap #1: Join Code Not Visible

### Problem
After team creation, the join code is shown once and never accessible again.

### Solution: Team Settings Page

Create `/team-settings` page (coach-only) that displays:
- Team name
- Athlete join code (copyable)
- Coach invite code (generate on-demand, copyable)
- Regenerate buttons for both codes

**UI Location**: Add "Team Settings" to the sidebar/nav for coaches.

---

## Workflow Gap #2: Coaches Can't Link Athletes

### Problem
`LinkAthleteDialog` exists but isn't integrated into any UI. Coaches have no way to manually link a signed-up athlete to their shell record.

### Solution: Add Linking UI

**Option A - Athletes Page**: 
When viewing unlinked profiles (athletes who signed up but aren't linked to shell records), show a "Link to Roster" button that opens `LinkAthleteDialog`.

**Option B - Athlete Detail Page**:
When viewing a shell athlete (no linked profile), show "Link Account" button.

**Implementation**: 
1. On Athletes page, add a section showing "Pending Accounts" - users who joined the team but aren't linked to any shell athlete
2. Each pending account has a "Link to Athlete" button → opens dialog to select which shell athlete to link

---

## Workflow Gap #3: No Code Regeneration

### Problem
If a join code is leaked/compromised, there's no way to invalidate it.

### Solution
On Team Settings page, add "Regenerate Code" buttons that:
1. Generate new random code
2. Update the database
3. Show confirmation toast

---

## Workflow Gap #4: Athlete Joins Before Shell Record

### Problem
If an athlete signs up and joins the team before the coach creates their shell record, there's no merge path.

### Solution
This is handled by Gap #2's solution. The athlete appears in "Pending Accounts" and the coach can:
1. Create a shell athlete record
2. Link the pending account to it

OR we auto-create a shell athlete when an athlete joins (simpler):
```typescript
// When athlete joins team, auto-create team_athlete record
const { data: athlete } = await supabase
  .from('team_athletes')
  .insert({
    team_id: team.id,
    profile_id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    created_by: profile.id, // self-created
    season_id: activeSeason?.id
  });
```

---

## Implementation Order

### Phase 1: Security Fix (Critical)
1. Migration: Add `coach_invite_code` column to teams
2. Update `JoinTeam.tsx` to determine role from code type, not profile
3. Update RLS if needed

### Phase 2: Team Settings Page
1. Create `/team-settings` route (coach-only)
2. Display both codes with copy buttons
3. Add regenerate functionality
4. Add to navigation

### Phase 3: Athlete Linking
1. Add "Pending Accounts" section to Athletes page
2. Wire up `LinkAthleteDialog` 
3. Consider auto-creating team_athlete on join

---

## Database Changes Summary

```sql
-- 1. Add coach invite code column
ALTER TABLE public.teams 
ADD COLUMN coach_invite_code TEXT UNIQUE;

-- 2. Function to regenerate codes
CREATE OR REPLACE FUNCTION public.regenerate_team_code(
  _team_id UUID,
  _code_type TEXT -- 'athlete' or 'coach'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Verify caller is team coach
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  new_code := upper(substr(md5(random()::text), 1, 6));
  
  IF _code_type = 'athlete' THEN
    UPDATE teams SET join_code = new_code WHERE id = _team_id;
  ELSIF _code_type = 'coach' THEN
    UPDATE teams SET coach_invite_code = new_code WHERE id = _team_id;
  END IF;
  
  RETURN new_code;
END;
$$;
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/pages/TeamSettings.tsx` | Team settings page for coaches |
| `src/hooks/useTeamSettings.ts` | Hooks for team code management |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/JoinTeam.tsx` | Check code type, assign role accordingly |
| `src/pages/Athletes.tsx` | Add pending accounts section |
| `src/App.tsx` | Add `/team-settings` route |
| `src/components/layout/AppLayout.tsx` | Add Team Settings nav link |

---

## Security Considerations

1. **Coach codes are optional**: Only generated when explicitly requested
2. **Codes are independent**: Regenerating athlete code doesn't affect coach code
3. **RLS unchanged**: Existing policies still protect data; we're just fixing the entry point
4. **Audit trail**: Consider logging when codes are regenerated

---

## Testing Checklist

- [ ] Athlete with join code cannot gain coach access
- [ ] Coach with coach_invite_code gets coach access
- [ ] Athlete code doesn't work for coach_invite_code field
- [ ] Codes are visible on Team Settings page
- [ ] Code regeneration works
- [ ] Linking athletes to shell records works
- [ ] Auto-creation of team_athlete on join works (if implemented)
