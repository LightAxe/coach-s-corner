
-- RPC function to look up a team by join/invite code without exposing the teams table directly
CREATE OR REPLACE FUNCTION public.lookup_team_by_code(_code text)
RETURNS TABLE(id uuid, name text, code_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  upper_code TEXT := upper(_code);
BEGIN
  -- Try athlete join code first
  RETURN QUERY
  SELECT t.id, t.name, 'athlete'::text AS code_type
  FROM public.teams t
  WHERE t.join_code = upper_code
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try coach invite code
  RETURN QUERY
  SELECT t.id, t.name, 'coach'::text AS code_type
  FROM public.teams t
  WHERE t.coach_invite_code = upper_code
  LIMIT 1;
END;
$$;
