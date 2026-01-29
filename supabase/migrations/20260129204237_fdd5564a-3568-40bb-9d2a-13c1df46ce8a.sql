-- Create table to store OTP codes
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_otp_codes_email_code ON public.otp_codes(email, code);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- No RLS needed - this table is only accessed via edge functions with service role
-- But we'll enable RLS and add a permissive policy for service role access
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role has full access to OTP codes"
ON public.otp_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to clean up expired OTP codes (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.otp_codes WHERE expires_at < now() OR used = true;
$$;