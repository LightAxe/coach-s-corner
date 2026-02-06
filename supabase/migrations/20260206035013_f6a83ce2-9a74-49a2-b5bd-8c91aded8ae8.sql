CREATE POLICY "Team members can view team athletes"
  ON public.team_athletes FOR SELECT
  USING (is_team_member(team_id, auth.uid()));