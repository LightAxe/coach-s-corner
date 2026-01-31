-- Add coach_invite_code column to teams table
ALTER TABLE public.teams 
ADD COLUMN coach_invite_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_teams_coach_invite_code ON public.teams(coach_invite_code) WHERE coach_invite_code IS NOT NULL;

-- Function to regenerate team codes (athlete or coach)
CREATE OR REPLACE FUNCTION public.regenerate_team_code(
  _team_id UUID,
  _code_type TEXT -- 'athlete' or 'coach'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Verify caller is team coach
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Generate new 6-character code
  new_code := upper(substr(md5(random()::text), 1, 6));
  
  IF _code_type = 'athlete' THEN
    UPDATE teams SET join_code = new_code WHERE id = _team_id;
  ELSIF _code_type = 'coach' THEN
    UPDATE teams SET coach_invite_code = new_code WHERE id = _team_id;
  ELSE
    RAISE EXCEPTION 'Invalid code type. Must be "athlete" or "coach"';
  END IF;
  
  RETURN new_code;
END;
$$;

-- Function to generate coach invite code on demand
CREATE OR REPLACE FUNCTION public.generate_coach_invite_code(_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  existing_code TEXT;
BEGIN
  -- Verify caller is team coach
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Check if code already exists
  SELECT coach_invite_code INTO existing_code FROM teams WHERE id = _team_id;
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate new 6-character code
  new_code := upper(substr(md5(random()::text), 1, 6));
  
  UPDATE teams SET coach_invite_code = new_code WHERE id = _team_id;
  
  RETURN new_code;
END;
$$;