
-- Rename email column to identifier in otp_rate_limits for dual email/phone support
ALTER TABLE public.otp_rate_limits RENAME COLUMN email TO identifier;

-- Update the cleanup function to use new column name
CREATE OR REPLACE FUNCTION public.cleanup_otp_rate_limits()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.otp_rate_limits WHERE created_at < now() - interval '1 hour';
$function$;
