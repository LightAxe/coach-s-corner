-- Add phone column to profiles table for future SMS OTP support
ALTER TABLE public.profiles ADD COLUMN phone TEXT;