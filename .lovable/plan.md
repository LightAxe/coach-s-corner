
# Parent Role: Privacy-Focused Code-Based Linking

This plan implements a privacy-focused approach where parents join via athlete-specific codes rather than selecting from a team roster.

---

## Summary of Changes

| Component | Type | Description |
|-----------|------|-------------|
| Database Migration | New | Create `parent_link_codes` table and update `parent_athlete_links` |
| Database Functions | New | Code generation, validation, and linking logic |
| `JoinTeam.tsx` | Modified | Detect parent link codes and redirect appropriately |
| `LinkChildPage.tsx` | New | Page for parents to enter child link codes |
| Athlete Detail Page | Modified | Add code generation UI for coaches |
| Parent Dashboard | New | Read-only view of linked children's data |
| Hooks | New | Parent data management hooks |

---

## Database Design

### Problem with Current Design
The existing `parent_athlete_links` table links `parent_id` to `athlete_id`, where both reference `profiles.id`. This means:
- Parents can only link to athletes who have signed up (have a profile)
- Shell athletes (coach-created, no account) cannot have parents linked

### New Design: Link to Team Athletes

We need to change `parent_athlete_links` to reference `team_athletes.id` instead of `profiles.id`. This supports:
- Parents linking to shell athletes (no login required for athlete)
- Parents linking to athletes who have accounts
- Multiple parents per athlete
- Multiple athletes per parent (across teams)

### New Table: `parent_link_codes`

```sql
CREATE TABLE public.parent_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_athlete_id UUID NOT NULL REFERENCES team_athletes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id)
);
```

**Key Features:**
- Codes linked to specific `team_athlete_id` (works for shell or linked athletes)
- Expires after 30 days by default
- Tracks who created it (coach or athlete)
- Tracks when/by whom it was used (for audit)
- One-time use (set `used_at` when claimed)

### Updated Table: `parent_athlete_links`

```sql
-- Change foreign key from profiles.id to team_athletes.id
ALTER TABLE parent_athlete_links 
  DROP CONSTRAINT parent_athlete_links_athlete_id_fkey,
  ADD CONSTRAINT parent_athlete_links_team_athlete_id_fkey 
    FOREIGN KEY (athlete_id) REFERENCES team_athletes(id) ON DELETE CASCADE;

-- Rename column for clarity
ALTER TABLE parent_athlete_links RENAME COLUMN athlete_id TO team_athlete_id;
```

**RLS Policies for parent_link_codes:**
- Coaches can create codes for any team athlete they manage
- Athletes can create codes for their own team_athlete record (if linked)
- Parents can view only codes they've used
- Nobody can view unused codes except the creator

**Updated RLS function:**
```sql
CREATE OR REPLACE FUNCTION public.is_parent_of_team_athlete(_parent_id UUID, _team_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_athlete_links
    WHERE parent_id = _parent_id AND team_athlete_id = _team_athlete_id
  );
$$;
```

---

## User Flows

### Flow 1: Coach Creates Parent Code

```text
Coach on Athlete Detail Page
    |
    v
Clicks "Generate Parent Link Code"
    |
    v
System creates code in parent_link_codes
    |
    v
Coach shares code with parent (e.g., via email/text)
    |
    v
Parent signs up as "Parent" role
    |
    v
Parent goes to /link-child (redirected if no links)
    |
    v
Parent enters code
    |
    v
System creates parent_athlete_links entry
    |
    v
Parent sees child's dashboard
```

### Flow 2: Athlete Creates Parent Code (Self-Service)

```text
Athlete logged in
    |
    v
Athlete goes to Settings/Profile
    |
    v
Clicks "Generate Parent Access Code"
    |
    v
System creates code linked to their team_athlete record
    |
    v
Athlete shares code with parent
    |
    v
(Same redemption flow as above)
```

### Flow 3: Parent Adding Additional Children

```text
Parent on Dashboard
    |
    v
Clicks "Add Another Child"
    |
    v
Opens dialog to enter additional code
    |
    v
System validates and creates another parent_athlete_links entry
    |
    v
Dashboard now shows multiple children
```

---

## New Files

### `src/pages/LinkChild.tsx`
Parent-facing page to enter link codes.

- Shows current linked children (if any)
- Form to enter 6-character code
- "Add Another Child" button
- Validates code and creates link
- Shows success/error feedback

### `src/components/dashboard/ParentDashboard.tsx`
Read-only dashboard for parents showing:

- Child selector (if multiple children linked)
- Selected child's upcoming workouts
- Selected child's recent workout logs
- Selected child's race results/PRs
- No edit/log buttons (read-only)

### `src/hooks/useParentData.ts`
Data hooks for parent functionality:

- `useLinkedChildren()` - Get all team_athletes linked to current parent
- `useGenerateParentCode()` - Create a new parent link code
- `useRedeemParentCode()` - Validate and use a parent link code
- `useChildWorkouts()` - Get workouts for a specific child
- `useChildWorkoutLogs()` - Get workout logs for a child
- `useChildRaceResults()` - Get race results for a child

### `src/components/athletes/GenerateParentCodeDialog.tsx`
Dialog for coaches/athletes to generate a parent code:

- Shows generated code prominently
- Copy button
- Expiration notice (30 days)
- Instructions for parent

---

## Modified Files

### `src/App.tsx`
Add routes:
- `/link-child` - Parent code entry page

### `src/components/ProtectedRoute.tsx`
Add parent redirect logic:
- If user is parent with no linked children, redirect to `/link-child`
- Parents don't need team membership (they access via child links)

### `src/pages/AthleteDetail.tsx`
Add for coaches:
- "Generate Parent Code" button
- Opens `GenerateParentCodeDialog`

### `src/pages/Dashboard.tsx`
- Detect if user is parent
- Render `ParentDashboard` instead of standard dashboard

### `src/components/layout/AppLayout.tsx`
Navigation filtering for parents:
- Only show Dashboard
- Add "Link Child" option to add more children

### `src/pages/JoinTeam.tsx`
Detect parent link codes:
- If code matches `parent_link_codes` table, handle differently
- Create `parent_athlete_links` entry instead of `team_memberships`

**Alternative approach:** Keep JoinTeam for team joining only, have separate flow for parent linking.

---

## Database Migration SQL

```sql
-- 1. Create parent link codes table
CREATE TABLE public.parent_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_athlete_id UUID NOT NULL REFERENCES public.team_athletes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.parent_link_codes ENABLE ROW LEVEL SECURITY;

-- 2. Update parent_athlete_links to reference team_athletes
-- Note: We must handle existing data (currently empty based on query)
ALTER TABLE public.parent_athlete_links 
  DROP CONSTRAINT IF EXISTS parent_athlete_links_athlete_id_fkey;

ALTER TABLE public.parent_athlete_links 
  RENAME COLUMN athlete_id TO team_athlete_id;

ALTER TABLE public.parent_athlete_links 
  ADD CONSTRAINT parent_athlete_links_team_athlete_fkey 
    FOREIGN KEY (team_athlete_id) REFERENCES public.team_athletes(id) ON DELETE CASCADE;

-- 3. Create code generation function
CREATE OR REPLACE FUNCTION public.generate_parent_link_code(_team_athlete_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  athlete_team_id UUID;
BEGIN
  -- Get the team for this athlete
  SELECT team_id INTO athlete_team_id FROM team_athletes WHERE id = _team_athlete_id;
  
  IF athlete_team_id IS NULL THEN
    RAISE EXCEPTION 'Athlete not found';
  END IF;
  
  -- Check authorization: must be coach of the team OR the athlete themselves
  IF NOT (
    is_team_coach(athlete_team_id, auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM team_athletes 
      WHERE id = _team_athlete_id AND profile_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate code for this athlete';
  END IF;
  
  -- Generate cryptographically random 6-character code
  new_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  
  -- Insert the code
  INSERT INTO parent_link_codes (team_athlete_id, code, created_by)
  VALUES (_team_athlete_id, new_code, auth.uid());
  
  RETURN new_code;
END;
$$;

-- 4. Create code redemption function
CREATE OR REPLACE FUNCTION public.redeem_parent_link_code(_code TEXT)
RETURNS UUID  -- Returns team_athlete_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
  current_profile_role user_role;
BEGIN
  -- Get the code record
  SELECT * INTO code_record 
  FROM parent_link_codes 
  WHERE code = upper(_code) 
    AND used_at IS NULL 
    AND expires_at > now();
  
  IF code_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired code';
  END IF;
  
  -- Verify user is a parent
  SELECT role INTO current_profile_role FROM profiles WHERE id = auth.uid();
  IF current_profile_role != 'parent' THEN
    RAISE EXCEPTION 'Only parent accounts can use this code';
  END IF;
  
  -- Check if already linked to this athlete
  IF EXISTS (
    SELECT 1 FROM parent_athlete_links 
    WHERE parent_id = auth.uid() AND team_athlete_id = code_record.team_athlete_id
  ) THEN
    RAISE EXCEPTION 'You are already linked to this athlete';
  END IF;
  
  -- Mark code as used
  UPDATE parent_link_codes 
  SET used_at = now(), used_by = auth.uid() 
  WHERE id = code_record.id;
  
  -- Create the parent-athlete link
  INSERT INTO parent_athlete_links (parent_id, team_athlete_id)
  VALUES (auth.uid(), code_record.team_athlete_id);
  
  RETURN code_record.team_athlete_id;
END;
$$;

-- 5. Update is_parent_of_athlete function to use team_athlete_id
CREATE OR REPLACE FUNCTION public.is_parent_of_team_athlete(_parent_id UUID, _team_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_athlete_links
    WHERE parent_id = _parent_id AND team_athlete_id = _team_athlete_id
  );
$$;

-- 6. RLS policies for parent_link_codes
CREATE POLICY "Coaches can create codes for their athletes"
ON public.parent_link_codes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id 
    AND is_team_coach(ta.team_id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id AND ta.profile_id = auth.uid()
  )
);

CREATE POLICY "Code creators can view their codes"
ON public.parent_link_codes FOR SELECT
USING (created_by = auth.uid() OR used_by = auth.uid());

CREATE POLICY "Code creators can delete unused codes"
ON public.parent_link_codes FOR DELETE
USING (created_by = auth.uid() AND used_at IS NULL);

-- 7. Update RLS policies that use is_parent_of_athlete to use new function
-- (These need to be identified and updated across tables)
```

---

## RLS Policy Updates Required

Several existing policies use `is_parent_of_athlete()` which needs updating:

| Table | Policy | Change Needed |
|-------|--------|---------------|
| `workout_logs` | Parents can view linked athlete workout logs | Update to check team_athlete_id via join |
| `profiles` | Parents can view linked athlete profiles | Update to check via team_athletes.profile_id |
| `scheduled_workouts` | Parents can view child's team workouts | Already uses team membership join |
| `races` | Parents can view team races | Already uses team membership join |
| `seasons` | Parents can view seasons | Already uses team membership join |
| `announcements` | Parents can view team announcements | Already uses team membership join |

The key insight: parents now don't need team membership. Their access is derived from `parent_athlete_links` -> `team_athletes` -> `team_id`.

---

## Parent Access Pattern

With this new design, parent access to team resources works as follows:

```text
parent_athlete_links.parent_id = auth.uid()
                |
                v
        team_athlete_id
                |
                v
        team_athletes.team_id
                |
                v
    Access to team's workouts, races, announcements, etc.
```

This means we need to update RLS policies to support this access pattern.

---

## Implementation Order

### Phase 1: Database Schema (Migration)
1. Create `parent_link_codes` table
2. Modify `parent_athlete_links` to reference `team_athletes`
3. Create helper functions
4. Update/create RLS policies

### Phase 2: Code Generation (Coach Side)
1. Add `useGenerateParentCode` hook
2. Create `GenerateParentCodeDialog` component
3. Add to `AthleteDetail.tsx`

### Phase 3: Code Redemption (Parent Side)
1. Create `useRedeemParentCode` hook
2. Create `LinkChild.tsx` page
3. Update `ProtectedRoute.tsx` for parent redirect
4. Add route in `App.tsx`

### Phase 4: Parent Dashboard
1. Create `useLinkedChildren` hook
2. Create `useChildWorkouts`, `useChildWorkoutLogs` hooks
3. Create `ParentDashboard.tsx`
4. Update `Dashboard.tsx` to render parent view
5. Update `AppLayout.tsx` navigation for parents

### Phase 5: Athlete Self-Service (Optional)
1. Add settings/profile page for athletes
2. Add "Generate Parent Code" button for linked athletes

---

## Security Considerations

1. **Codes are single-use**: Once redeemed, cannot be used again
2. **Codes expire**: 30-day default expiration prevents leaked codes from being used indefinitely
3. **Role enforcement**: Only parent-role accounts can redeem codes
4. **Audit trail**: Tracks who created code, when used, by whom
5. **Privacy by design**: Parents cannot browse athletes; they must have a code
6. **Revocable access**: Coaches can delete parent_athlete_links to revoke access

---

## Testing Checklist

- [ ] Coach can generate parent code for any team athlete
- [ ] Coach can generate code for shell athletes (no profile)
- [ ] Athlete can generate parent code for themselves
- [ ] Parent can sign up and enter code on /link-child page
- [ ] Parent sees child's data on dashboard
- [ ] Parent can add multiple children with additional codes
- [ ] Expired codes are rejected
- [ ] Used codes cannot be reused
- [ ] Non-parent accounts cannot use parent codes
- [ ] Parent cannot access athletes they're not linked to
- [ ] Coach can revoke parent access by deleting link
