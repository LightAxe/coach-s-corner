-- Fix critical security vulnerability: otp_codes table has overly permissive RLS policy
-- The current policy "Service role has full access to OTP codes" uses USING (true)
-- which allows ANY authenticated user to read all OTP codes, enabling auth bypass

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Service role has full access to OTP codes" ON public.otp_codes;

-- Create a restrictive policy that denies all access to authenticated users
-- Edge functions use service_role key which bypasses RLS entirely, so they will still work
CREATE POLICY "Deny all access to otp_codes" ON public.otp_codes
  FOR ALL USING (false) WITH CHECK (false);