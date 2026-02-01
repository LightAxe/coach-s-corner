-- Fix INSERT policy for workout_logs to properly handle shell athletes (profile_id is NULL)
-- The existing policy has issues when profile_id is NULL

-- Drop the existing coach INSERT policy
DROP POLICY IF EXISTS "Coaches can create team athlete workout logs" ON public.workout_logs;

-- Recreate with proper NULL handling
-- A coach can insert if:
-- 1. They are inserting for themselves (profile_id = auth.uid())
-- 2. OR they are inserting for a team_athlete they coach (profile_id can be NULL for shell athletes)
CREATE POLICY "Coaches can create team athlete workout logs"
ON public.workout_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Either inserting for own profile
  (profile_id IS NOT NULL AND profile_id = auth.uid())
  OR
  -- Or inserting for a team athlete they coach (works for shell athletes where profile_id is NULL)
  (team_athlete_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = workout_logs.team_athlete_id 
    AND is_team_coach(ta.team_id, auth.uid())
  ))
);

-- Also fix SELECT policy for coaches to handle NULL profile_id
DROP POLICY IF EXISTS "Coaches can view team workout logs" ON public.workout_logs;

CREATE POLICY "Coaches can view team workout logs"
ON public.workout_logs
FOR SELECT
TO authenticated
USING (
  -- Own logs
  (profile_id IS NOT NULL AND profile_id = auth.uid())
  OR
  -- Team athlete logs (including shell athletes)
  (team_athlete_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = workout_logs.team_athlete_id 
    AND is_team_coach(ta.team_id, auth.uid())
  ))
);

-- Also fix UPDATE policy for coaches
DROP POLICY IF EXISTS "Coaches can update team athlete workout logs" ON public.workout_logs;

CREATE POLICY "Coaches can update team athlete workout logs"
ON public.workout_logs
FOR UPDATE
TO authenticated
USING (
  (profile_id IS NOT NULL AND profile_id = auth.uid())
  OR
  (team_athlete_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = workout_logs.team_athlete_id 
    AND is_team_coach(ta.team_id, auth.uid())
  ))
);