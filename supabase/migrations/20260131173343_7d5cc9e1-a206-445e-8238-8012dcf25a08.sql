-- 1. Create global distances table
CREATE TABLE public.distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed distances
INSERT INTO public.distances (name, sort_order) VALUES
  ('1500m', 0),
  ('Mile', 1),
  ('3000m', 2),
  ('2 Mile', 3),
  ('5K', 4);

-- RLS: public read only
ALTER TABLE public.distances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view distances"
  ON public.distances FOR SELECT USING (true);

-- 2. Create races table
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  race_date DATE NOT NULL,
  distance_id UUID NOT NULL REFERENCES public.distances(id),
  location TEXT,
  details TEXT,
  transportation_info TEXT,
  map_link TEXT,
  results_link TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view races"
  ON public.races FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Coaches can create races"
  ON public.races FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update races"
  ON public.races FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete races"
  ON public.races FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- 3. Create unified race_results table
CREATE TABLE public.race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES public.races(id) ON DELETE CASCADE,
  team_athlete_id UUID NOT NULL REFERENCES public.team_athletes(id) ON DELETE CASCADE,
  time_seconds NUMERIC(10,2) NOT NULL,
  place INTEGER,
  distance_id UUID REFERENCES public.distances(id),
  achieved_at DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_race_athlete UNIQUE (race_id, team_athlete_id),
  CONSTRAINT offseason_requires_distance_date 
    CHECK (race_id IS NOT NULL OR (distance_id IS NOT NULL AND achieved_at IS NOT NULL))
);

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View results for team athletes"
  ON public.race_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_member(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can insert results"
  ON public.race_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can update results"
  ON public.race_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

CREATE POLICY "Coaches can delete results"
  ON public.race_results FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM team_athletes ta
    WHERE ta.id = team_athlete_id
    AND is_team_coach(ta.team_id, auth.uid())
  ));

-- 4. Drop old tables
DROP TABLE IF EXISTS public.prs;
DROP TABLE IF EXISTS public.team_distances;