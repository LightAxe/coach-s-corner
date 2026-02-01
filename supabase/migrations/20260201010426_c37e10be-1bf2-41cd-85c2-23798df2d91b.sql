-- Phase 1 & 2 Database Migration: Rate Limiting & Secure Views

-- 1. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  action_type text NOT NULL, -- 'send' or 'verify'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_otp_rate_limits_lookup 
  ON public.otp_rate_limits(email, action_type, created_at);

-- RLS: Only service role can access (deny all authenticated users)
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.otp_rate_limits
  FOR ALL USING (false) WITH CHECK (false);

-- 2. Add verification_attempts column to otp_codes
ALTER TABLE public.otp_codes ADD COLUMN IF NOT EXISTS 
  verification_attempts integer DEFAULT 0;

-- 3. Create cleanup function for rate limits
CREATE OR REPLACE FUNCTION public.cleanup_otp_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.otp_rate_limits WHERE created_at < now() - interval '1 hour';
$$;

-- 4. Helper function for checking coach status by uid (no parameter needed)
CREATE OR REPLACE FUNCTION public.is_team_coach_by_uid(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id
      AND profile_id = auth.uid()
      AND role = 'coach'
  );
$$;

-- 5. Create secure view for teams that hides codes from non-coaches
CREATE OR REPLACE VIEW public.teams_secure AS
SELECT 
  id,
  name,
  created_by,
  created_at,
  CASE WHEN is_team_coach_by_uid(id) THEN join_code ELSE NULL END as join_code,
  CASE WHEN is_team_coach_by_uid(id) THEN coach_invite_code ELSE NULL END as coach_invite_code
FROM public.teams;

GRANT SELECT ON public.teams_secure TO authenticated;

-- 6. Create secure view for profiles that hides PII from non-coaches
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id,
  first_name,
  last_name,
  role,
  created_at,
  updated_at,
  CASE 
    WHEN id = auth.uid() THEN email
    WHEN EXISTS (
      SELECT 1 FROM team_memberships tm1
      JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.profile_id = auth.uid() 
        AND tm1.role = 'coach'
        AND tm2.profile_id = profiles.id
    ) THEN email
    ELSE NULL 
  END as email,
  CASE 
    WHEN id = auth.uid() THEN phone
    WHEN EXISTS (
      SELECT 1 FROM team_memberships tm1
      JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.profile_id = auth.uid() 
        AND tm1.role = 'coach'
        AND tm2.profile_id = profiles.id
    ) THEN phone
    ELSE NULL 
  END as phone
FROM public.profiles;

GRANT SELECT ON public.profiles_secure TO authenticated;

-- 7. Update team code generation to use cryptographic randomness
CREATE OR REPLACE FUNCTION public.regenerate_team_code(_team_id uuid, _code_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Use cryptographic randomness instead of md5(random())
  new_code := upper(encode(gen_random_bytes(3), 'hex'));
  
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

-- 8. Update generate_coach_invite_code to use cryptographic randomness
CREATE OR REPLACE FUNCTION public.generate_coach_invite_code(_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  existing_code TEXT;
BEGIN
  IF NOT is_team_coach(_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  SELECT coach_invite_code INTO existing_code FROM teams WHERE id = _team_id;
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Use cryptographic randomness
  new_code := upper(encode(gen_random_bytes(3), 'hex'));
  
  UPDATE teams SET coach_invite_code = new_code WHERE id = _team_id;
  
  RETURN new_code;
END;
$$;