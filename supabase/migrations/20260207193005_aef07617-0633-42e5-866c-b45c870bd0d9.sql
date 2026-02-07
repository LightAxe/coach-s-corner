-- Deny anonymous (unauthenticated) access to profiles table
CREATE POLICY "deny_anonymous_access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);