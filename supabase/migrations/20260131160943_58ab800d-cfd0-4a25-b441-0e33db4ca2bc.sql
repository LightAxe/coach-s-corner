-- Create team_athletes table for shell and linked athletes
CREATE TABLE public.team_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_team_profile UNIQUE (team_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.team_athletes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_athletes

-- Coaches can view their team's athletes
CREATE POLICY "Coaches can view team athletes"
  ON public.team_athletes FOR SELECT
  USING (is_team_coach(team_id, auth.uid()));

-- Athletes can view their own team_athlete record (when linked)
CREATE POLICY "Athletes can view own team athlete record"
  ON public.team_athletes FOR SELECT
  USING (profile_id = auth.uid());

-- Coaches can create athletes in their teams
CREATE POLICY "Coaches can create team athletes"
  ON public.team_athletes FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

-- Coaches can update (for linking profiles)
CREATE POLICY "Coaches can update team athletes"
  ON public.team_athletes FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

-- Coaches can delete
CREATE POLICY "Coaches can delete team athletes"
  ON public.team_athletes FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- Create completion status enum
CREATE TYPE public.completion_status AS ENUM ('none', 'partial', 'complete');

-- Add new columns to workout_logs
ALTER TABLE public.workout_logs
  ADD COLUMN team_athlete_id UUID REFERENCES public.team_athletes(id) ON DELETE CASCADE,
  ADD COLUMN completion_status public.completion_status DEFAULT 'complete',
  ADD COLUMN logged_by UUID REFERENCES public.profiles(id);

-- Make profile_id nullable (for shell athlete logs)
ALTER TABLE public.workout_logs
  ALTER COLUMN profile_id DROP NOT NULL;

-- Ensure at least one of profile_id or team_athlete_id is set
ALTER TABLE public.workout_logs
  ADD CONSTRAINT workout_logs_athlete_reference 
  CHECK (profile_id IS NOT NULL OR team_athlete_id IS NOT NULL);

-- Add RLS policies for coaches to manage workout logs via team_athletes

-- Coaches can create logs for team athletes
CREATE POLICY "Coaches can create team athlete workout logs"
  ON public.workout_logs FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.team_athletes ta
      WHERE ta.id = team_athlete_id
        AND is_team_coach(ta.team_id, auth.uid())
    )
  );

-- Coaches can update team workout logs
CREATE POLICY "Coaches can update team athlete workout logs"
  ON public.workout_logs FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_athletes ta
      WHERE ta.id = team_athlete_id
        AND is_team_coach(ta.team_id, auth.uid())
    )
  );

-- Coaches can delete team workout logs
CREATE POLICY "Coaches can delete team athlete workout logs"
  ON public.workout_logs FOR DELETE
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_athletes ta
      WHERE ta.id = team_athlete_id
        AND is_team_coach(ta.team_id, auth.uid())
    )
  );