-- Drop existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;
DROP POLICY IF EXISTS "Coaches can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Coaches can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Parents can view teams their children are in" ON public.teams;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Coaches can create teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Coaches can update their teams"
ON public.teams FOR UPDATE
TO authenticated
USING (is_team_coach(id, auth.uid()));

CREATE POLICY "Coaches can delete their teams"
ON public.teams FOR DELETE
TO authenticated
USING (is_team_coach(id, auth.uid()));

CREATE POLICY "Team members can view teams"
ON public.teams FOR SELECT
TO authenticated
USING (is_team_member(id, auth.uid()));

CREATE POLICY "Parents can view teams their children are in"
ON public.teams FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_athlete_links pal
    JOIN team_memberships tm ON pal.athlete_id = tm.profile_id
    WHERE pal.parent_id = auth.uid() AND tm.team_id = teams.id
  )
);