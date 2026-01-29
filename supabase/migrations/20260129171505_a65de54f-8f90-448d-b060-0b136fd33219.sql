-- Create role enum
CREATE TYPE public.user_role AS ENUM ('coach', 'athlete', 'parent');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_memberships table
CREATE TABLE public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL CHECK (role IN ('coach', 'athlete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

-- Create parent_athlete_links table
CREATE TABLE public.parent_athlete_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, athlete_id)
);

-- Create distances enum for PRs
CREATE TYPE public.distance_type AS ENUM ('1600m', '3000m', '5000m', '3200m', 'mile', '2mile', 'other');

-- Create prs table
CREATE TABLE public.prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  distance distance_type NOT NULL,
  custom_distance TEXT,
  time_seconds INTEGER NOT NULL,
  achieved_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workout types enum
CREATE TYPE public.workout_type AS ENUM ('easy', 'tempo', 'interval', 'long', 'rest', 'race', 'other');

-- Create workout_templates table (library of reusable workouts)
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type workout_type NOT NULL DEFAULT 'easy',
  description TEXT,
  distance TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create scheduled_workouts table (calendar entries)
CREATE TABLE public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type workout_type NOT NULL DEFAULT 'easy',
  description TEXT,
  distance TEXT,
  scheduled_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workout_logs table (athlete completion logs)
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_workout_id UUID NOT NULL REFERENCES public.scheduled_workouts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  effort_level INTEGER CHECK (effort_level >= 1 AND effort_level <= 10),
  notes TEXT,
  how_felt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scheduled_workout_id, profile_id)
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prs_updated_at BEFORE UPDATE ON public.prs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_logs_updated_at BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SECURITY HELPER FUNCTIONS
-- =====================

-- Check if user is a member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID, _profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id AND profile_id = _profile_id
  );
$$;

-- Check if user is a coach of a team
CREATE OR REPLACE FUNCTION public.is_team_coach(_team_id UUID, _profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id AND profile_id = _profile_id AND role = 'coach'
  );
$$;

-- Check if parent is linked to athlete
CREATE OR REPLACE FUNCTION public.is_parent_of_athlete(_parent_id UUID, _athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_athlete_links
    WHERE parent_id = _parent_id AND athlete_id = _athlete_id
  );
$$;

-- Get all athlete IDs linked to a parent
CREATE OR REPLACE FUNCTION public.get_linked_athlete_ids(_parent_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT athlete_id FROM public.parent_athlete_links
  WHERE parent_id = _parent_id;
$$;

-- Get all team IDs for a profile
CREATE OR REPLACE FUNCTION public.get_team_ids_for_profile(_profile_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_memberships
  WHERE profile_id = _profile_id;
$$;

-- Check if current user can view athlete data (is coach of their team OR is parent)
CREATE OR REPLACE FUNCTION public.can_view_athlete(_athlete_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = _athlete_id
    OR public.is_parent_of_athlete(auth.uid(), _athlete_id)
    OR EXISTS (
      SELECT 1 FROM public.team_memberships tm1
      JOIN public.team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.profile_id = auth.uid() 
        AND tm1.role = 'coach'
        AND tm2.profile_id = _athlete_id
    );
$$;

-- =====================
-- ENABLE RLS
-- =====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_athlete_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES
-- =====================

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Coaches can view team member profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships coach_tm
      JOIN public.team_memberships member_tm ON coach_tm.team_id = member_tm.team_id
      WHERE coach_tm.profile_id = auth.uid()
        AND coach_tm.role = 'coach'
        AND member_tm.profile_id = profiles.id
    )
  );

CREATE POLICY "Parents can view linked athlete profiles"
  ON public.profiles FOR SELECT
  USING (public.is_parent_of_athlete(auth.uid(), id));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- TEAMS (hide join_code from non-coaches)
CREATE POLICY "Team members can view teams"
  ON public.teams FOR SELECT
  USING (public.is_team_member(id, auth.uid()));

CREATE POLICY "Parents can view teams their children are in"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      JOIN public.team_memberships tm ON pal.athlete_id = tm.profile_id
      WHERE pal.parent_id = auth.uid() AND tm.team_id = teams.id
    )
  );

CREATE POLICY "Coaches can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Coaches can update their teams"
  ON public.teams FOR UPDATE
  USING (public.is_team_coach(id, auth.uid()));

CREATE POLICY "Coaches can delete their teams"
  ON public.teams FOR DELETE
  USING (public.is_team_coach(id, auth.uid()));

-- TEAM_MEMBERSHIPS
CREATE POLICY "Members can view memberships of their teams"
  ON public.team_memberships FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Parents can view child's team memberships"
  ON public.team_memberships FOR SELECT
  USING (public.is_parent_of_athlete(auth.uid(), profile_id));

CREATE POLICY "Users can join teams"
  ON public.team_memberships FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Coaches can manage team memberships"
  ON public.team_memberships FOR UPDATE
  USING (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can remove members"
  ON public.team_memberships FOR DELETE
  USING (public.is_team_coach(team_id, auth.uid()) OR profile_id = auth.uid());

-- PARENT_ATHLETE_LINKS
CREATE POLICY "Users can view their own links"
  ON public.parent_athlete_links FOR SELECT
  USING (parent_id = auth.uid() OR athlete_id = auth.uid());

CREATE POLICY "Parents can create links to athletes"
  ON public.parent_athlete_links FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Users can delete their own links"
  ON public.parent_athlete_links FOR DELETE
  USING (parent_id = auth.uid() OR athlete_id = auth.uid());

-- PRS
CREATE POLICY "Athletes can view own PRs"
  ON public.prs FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches can view team athlete PRs"
  ON public.prs FOR SELECT
  USING (public.can_view_athlete(profile_id));

CREATE POLICY "Parents can view linked athlete PRs"
  ON public.prs FOR SELECT
  USING (public.is_parent_of_athlete(auth.uid(), profile_id));

CREATE POLICY "Athletes can insert own PRs"
  ON public.prs FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Coaches can insert athlete PRs"
  ON public.prs FOR INSERT
  WITH CHECK (public.can_view_athlete(profile_id));

CREATE POLICY "Athletes can update own PRs"
  ON public.prs FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches can update team athlete PRs"
  ON public.prs FOR UPDATE
  USING (public.can_view_athlete(profile_id));

CREATE POLICY "Athletes can delete own PRs"
  ON public.prs FOR DELETE
  USING (profile_id = auth.uid());

-- WORKOUT_TEMPLATES
CREATE POLICY "Team members can view workout templates"
  ON public.workout_templates FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Coaches can create workout templates"
  ON public.workout_templates FOR INSERT
  WITH CHECK (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update workout templates"
  ON public.workout_templates FOR UPDATE
  USING (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete workout templates"
  ON public.workout_templates FOR DELETE
  USING (public.is_team_coach(team_id, auth.uid()));

-- SCHEDULED_WORKOUTS
CREATE POLICY "Team members can view scheduled workouts"
  ON public.scheduled_workouts FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Parents can view child's team workouts"
  ON public.scheduled_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      JOIN public.team_memberships tm ON pal.athlete_id = tm.profile_id
      WHERE pal.parent_id = auth.uid() AND tm.team_id = scheduled_workouts.team_id
    )
  );

CREATE POLICY "Coaches can create scheduled workouts"
  ON public.scheduled_workouts FOR INSERT
  WITH CHECK (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update scheduled workouts"
  ON public.scheduled_workouts FOR UPDATE
  USING (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete scheduled workouts"
  ON public.scheduled_workouts FOR DELETE
  USING (public.is_team_coach(team_id, auth.uid()));

-- WORKOUT_LOGS
CREATE POLICY "Athletes can view own workout logs"
  ON public.workout_logs FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Coaches can view team workout logs"
  ON public.workout_logs FOR SELECT
  USING (public.can_view_athlete(profile_id));

CREATE POLICY "Parents can view linked athlete workout logs"
  ON public.workout_logs FOR SELECT
  USING (public.is_parent_of_athlete(auth.uid(), profile_id));

CREATE POLICY "Athletes can create own workout logs"
  ON public.workout_logs FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Athletes can update own workout logs"
  ON public.workout_logs FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Athletes can delete own workout logs"
  ON public.workout_logs FOR DELETE
  USING (profile_id = auth.uid());

-- ANNOUNCEMENTS
CREATE POLICY "Team members can view announcements"
  ON public.announcements FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Parents can view team announcements"
  ON public.announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      JOIN public.team_memberships tm ON pal.athlete_id = tm.profile_id
      WHERE pal.parent_id = auth.uid() AND tm.team_id = announcements.team_id
    )
  );

CREATE POLICY "Coaches can create announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can update announcements"
  ON public.announcements FOR UPDATE
  USING (public.is_team_coach(team_id, auth.uid()));

CREATE POLICY "Coaches can delete announcements"
  ON public.announcements FOR DELETE
  USING (public.is_team_coach(team_id, auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX idx_team_memberships_profile_id ON public.team_memberships(profile_id);
CREATE INDEX idx_parent_athlete_links_parent_id ON public.parent_athlete_links(parent_id);
CREATE INDEX idx_parent_athlete_links_athlete_id ON public.parent_athlete_links(athlete_id);
CREATE INDEX idx_prs_profile_id ON public.prs(profile_id);
CREATE INDEX idx_scheduled_workouts_team_id ON public.scheduled_workouts(team_id);
CREATE INDEX idx_scheduled_workouts_date ON public.scheduled_workouts(scheduled_date);
CREATE INDEX idx_workout_logs_profile_id ON public.workout_logs(profile_id);
CREATE INDEX idx_workout_logs_scheduled_workout_id ON public.workout_logs(scheduled_workout_id);
CREATE INDEX idx_announcements_team_id ON public.announcements(team_id);