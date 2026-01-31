-- Create seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Only one active season per team
  CONSTRAINT unique_active_season_per_team EXCLUDE (team_id WITH =) WHERE (is_active = true)
);

-- Enable RLS on seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Seasons RLS policies
CREATE POLICY "Team members can view seasons"
  ON public.seasons FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Parents can view seasons"
  ON public.seasons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM parent_athlete_links pal
    JOIN team_memberships tm ON pal.athlete_id = tm.profile_id
    WHERE pal.parent_id = auth.uid() AND tm.team_id = seasons.team_id
  ));

CREATE POLICY "Coaches can create seasons"
  ON public.seasons FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update seasons"
  ON public.seasons FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete seasons"
  ON public.seasons FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- Add season_id to team_athletes (athletes belong to seasons)
ALTER TABLE public.team_athletes
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;

-- Add season_id to prs (for tracking SRs)
ALTER TABLE public.prs
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Add team_athlete_id to prs for shell athletes
ALTER TABLE public.prs
  ADD COLUMN team_athlete_id UUID REFERENCES public.team_athletes(id) ON DELETE CASCADE;

-- Make profile_id nullable on prs (shell athletes don't have profiles)
ALTER TABLE public.prs
  ALTER COLUMN profile_id DROP NOT NULL;

-- Add constraint: must have either profile_id or team_athlete_id
ALTER TABLE public.prs
  ADD CONSTRAINT prs_athlete_reference 
  CHECK (profile_id IS NOT NULL OR team_athlete_id IS NOT NULL);

-- Add season_id to scheduled_workouts
ALTER TABLE public.scheduled_workouts
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE;

-- Add athlete_notes field to scheduled_workouts for per-skill-level guidance
ALTER TABLE public.scheduled_workouts
  ADD COLUMN athlete_notes TEXT;

-- Add athlete_notes to workout_templates
ALTER TABLE public.workout_templates
  ADD COLUMN athlete_notes TEXT;

-- Update RLS for prs to handle team_athlete_id
CREATE POLICY "Coaches can view team athlete PRs via team_athletes"
  ON public.prs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = prs.team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can insert team athlete PRs via team_athletes"
  ON public.prs FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    OR can_view_athlete(profile_id)
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      WHERE ta.id = prs.team_athlete_id
      AND is_team_coach(ta.team_id, auth.uid())
    )
  );

CREATE POLICY "Coaches can update team athlete PRs via team_athletes"
  ON public.prs FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR can_view_athlete(profile_id)
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      WHERE ta.id = prs.team_athlete_id
      AND is_team_coach(ta.team_id, auth.uid())
    )
  );

CREATE POLICY "Coaches can delete team athlete PRs via team_athletes"
  ON public.prs FOR DELETE
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_athletes ta
      WHERE ta.id = prs.team_athlete_id
      AND is_team_coach(ta.team_id, auth.uid())
    )
  );