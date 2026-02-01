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

-- 2. Update parent_athlete_links to reference team_athletes instead of profiles
-- First drop the existing foreign key constraint
ALTER TABLE public.parent_athlete_links 
  DROP CONSTRAINT IF EXISTS parent_athlete_links_athlete_id_fkey;

-- Rename column for clarity
ALTER TABLE public.parent_athlete_links 
  RENAME COLUMN athlete_id TO team_athlete_id;

-- Add new foreign key to team_athletes
ALTER TABLE public.parent_athlete_links 
  ADD CONSTRAINT parent_athlete_links_team_athlete_fkey 
    FOREIGN KEY (team_athlete_id) REFERENCES public.team_athletes(id) ON DELETE CASCADE;

-- 3. Drop old RLS policies on parent_athlete_links that reference the old column
DROP POLICY IF EXISTS "Parents can create links to athletes" ON public.parent_athlete_links;
DROP POLICY IF EXISTS "Users can delete their own links" ON public.parent_athlete_links;
DROP POLICY IF EXISTS "Users can view their own links" ON public.parent_athlete_links;

-- 4. Create new RLS policies for parent_athlete_links
CREATE POLICY "Parents can view their links"
ON public.parent_athlete_links FOR SELECT
USING (parent_id = auth.uid());

CREATE POLICY "Parents can delete their links"
ON public.parent_athlete_links FOR DELETE
USING (parent_id = auth.uid());

-- Note: INSERT is handled by the redeem_parent_link_code function (SECURITY DEFINER)

-- 5. Create helper function to check if parent is linked to team athlete
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

-- 6. Create helper function to get team IDs that parent has access to via linked athletes
CREATE OR REPLACE FUNCTION public.get_parent_team_ids(_parent_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ta.team_id 
  FROM public.parent_athlete_links pal
  JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
  WHERE pal.parent_id = _parent_id;
$$;

-- 7. Create code generation function
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
  new_code := upper(encode(gen_random_bytes(3), 'hex'));
  
  -- Insert the code
  INSERT INTO parent_link_codes (team_athlete_id, code, created_by)
  VALUES (_team_athlete_id, new_code, auth.uid());
  
  RETURN new_code;
END;
$$;

-- 8. Create code redemption function
CREATE OR REPLACE FUNCTION public.redeem_parent_link_code(_code TEXT)
RETURNS UUID
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

-- 9. RLS policies for parent_link_codes
CREATE POLICY "Coaches and athletes can create codes"
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

CREATE POLICY "Code creators and users can view codes"
ON public.parent_link_codes FOR SELECT
USING (created_by = auth.uid() OR used_by = auth.uid());

CREATE POLICY "Code creators can delete unused codes"
ON public.parent_link_codes FOR DELETE
USING (created_by = auth.uid() AND used_at IS NULL);

-- 10. Update existing RLS policies that reference is_parent_of_athlete
-- Update profiles policy for parents
DROP POLICY IF EXISTS "Parents can view linked athlete profiles" ON public.profiles;

CREATE POLICY "Parents can view linked athlete profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.profile_id = profiles.id
  )
);

-- Update workout_logs policy for parents
DROP POLICY IF EXISTS "Parents can view linked athlete workout logs" ON public.workout_logs;

CREATE POLICY "Parents can view linked athlete workout logs"
ON public.workout_logs FOR SELECT
USING (
  -- Via team_athlete_id
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    WHERE pal.parent_id = auth.uid() 
    AND pal.team_athlete_id = workout_logs.team_athlete_id
  )
  OR
  -- Via profile_id (for athletes who have accounts)
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.profile_id = workout_logs.profile_id
  )
);

-- 11. Update other parent-related RLS policies to use the new access pattern
-- Update scheduled_workouts parent policy
DROP POLICY IF EXISTS "Parents can view child's team workouts" ON public.scheduled_workouts;

CREATE POLICY "Parents can view child's team workouts"
ON public.scheduled_workouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.team_id = scheduled_workouts.team_id
  )
);

-- Update seasons parent policy  
DROP POLICY IF EXISTS "Parents can view seasons" ON public.seasons;

CREATE POLICY "Parents can view seasons"
ON public.seasons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.team_id = seasons.team_id
  )
);

-- Update announcements parent policy
DROP POLICY IF EXISTS "Parents can view team announcements" ON public.announcements;

CREATE POLICY "Parents can view team announcements"
ON public.announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.team_id = announcements.team_id
  )
);

-- Update teams parent policy
DROP POLICY IF EXISTS "Parents can view teams their children are in" ON public.teams;

CREATE POLICY "Parents can view teams their children are in"
ON public.teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.team_id = teams.id
  )
);

-- 12. Add parent access to race_results for their linked athletes
CREATE POLICY "Parents can view linked athlete race results"
ON public.race_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    WHERE pal.parent_id = auth.uid() 
    AND pal.team_athlete_id = race_results.team_athlete_id
  )
);

-- 13. Add parent access to races through their linked athlete's team
CREATE POLICY "Parents can view races"
ON public.races FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    JOIN public.team_athletes ta ON pal.team_athlete_id = ta.id
    WHERE pal.parent_id = auth.uid() AND ta.team_id = races.team_id
  )
);

-- 14. Add parent access to team_athletes (their linked ones only)
CREATE POLICY "Parents can view their linked athletes"
ON public.team_athletes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    WHERE pal.parent_id = auth.uid() AND pal.team_athlete_id = team_athletes.id
  )
);