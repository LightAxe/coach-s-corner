-- Fix SECURITY DEFINER view warnings by recreating with security_invoker

-- Drop and recreate teams_secure view with security_invoker
DROP VIEW IF EXISTS public.teams_secure;

CREATE VIEW public.teams_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  name,
  created_by,
  created_at,
  CASE WHEN is_team_coach_by_uid(id) THEN join_code ELSE NULL END as join_code,
  CASE WHEN is_team_coach_by_uid(id) THEN coach_invite_code ELSE NULL END as coach_invite_code
FROM public.teams;

GRANT SELECT ON public.teams_secure TO authenticated;

-- Drop and recreate profiles_secure view with security_invoker
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
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