
-- DB function to find a profile by phone (last 10 digits), avoiding full-table scan in JS
CREATE OR REPLACE FUNCTION public.find_profile_by_phone(_phone_last10 text)
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.email, p.phone
  FROM public.profiles p
  WHERE p.phone IS NOT NULL
    AND right(regexp_replace(p.phone, '\D', '', 'g'), 10) = _phone_last10
  LIMIT 1;
$$;

-- Check if a phone conflicts with another profile
CREATE OR REPLACE FUNCTION public.check_phone_conflict(_phone_last10 text, _exclude_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.phone IS NOT NULL
      AND p.id != _exclude_id
      AND right(regexp_replace(p.phone, '\D', '', 'g'), 10) = _phone_last10
  );
$$;
