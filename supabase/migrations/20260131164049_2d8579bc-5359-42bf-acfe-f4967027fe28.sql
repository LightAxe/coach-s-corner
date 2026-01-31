-- Create team_distances table for custom distance options per team
CREATE TABLE public.team_distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Display name like "5K", "Mile", "3200m"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_team_distance_name UNIQUE (team_id, name)
);

-- Enable RLS
ALTER TABLE public.team_distances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view distances"
  ON public.team_distances FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Coaches can create distances"
  ON public.team_distances FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update distances"
  ON public.team_distances FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete distances"
  ON public.team_distances FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- Update prs table to use text-based distance instead of enum
-- First add a new column for the flexible distance
ALTER TABLE public.prs ADD COLUMN distance_name TEXT;

-- Migrate existing data from enum to text
UPDATE public.prs SET distance_name = 
  CASE distance
    WHEN '1600m' THEN '1600m'
    WHEN '3000m' THEN '3000m'
    WHEN '5000m' THEN '5K'
    WHEN '3200m' THEN '3200m'
    WHEN 'mile' THEN 'Mile'
    WHEN '2mile' THEN '2 Mile'
    WHEN 'other' THEN custom_distance
  END;

-- Make distance_name NOT NULL after migration
ALTER TABLE public.prs ALTER COLUMN distance_name SET NOT NULL;

-- Drop the old distance enum column (keep custom_distance for backwards compat)
ALTER TABLE public.prs DROP COLUMN distance;

-- Rename distance_name to distance for cleaner API
ALTER TABLE public.prs RENAME COLUMN distance_name TO distance;