-- Normalize and enforce unique US phone numbers on profiles.
-- This prevents multiple accounts from sharing the same phone identity.

CREATE OR REPLACE FUNCTION public.normalize_us_phone(input_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF input_phone IS NULL THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(input_phone, '\D', '', 'g');

  IF length(digits) = 10 THEN
    RETURN '+1' || digits;
  END IF;

  IF length(digits) = 11 AND left(digits, 1) = '1' THEN
    RETURN '+' || digits;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_enforce_unique_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone TEXT;
BEGIN
  IF NEW.phone IS NULL OR btrim(NEW.phone) = '' THEN
    NEW.phone := NULL;
    RETURN NEW;
  END IF;

  normalized_phone := public.normalize_us_phone(NEW.phone);

  IF normalized_phone IS NULL THEN
    RAISE EXCEPTION 'Phone number must be a valid US number'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> NEW.id
      AND public.normalize_us_phone(p.phone) = normalized_phone
  ) THEN
    RAISE EXCEPTION 'Phone number is already in use'
      USING ERRCODE = '23505';
  END IF;

  NEW.phone := normalized_phone;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_enforce_unique_phone ON public.profiles;
CREATE TRIGGER trg_profiles_enforce_unique_phone
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_enforce_unique_phone();
