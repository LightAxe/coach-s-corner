-- Add calendar_feed_token column to teams table
ALTER TABLE public.teams
ADD COLUMN calendar_feed_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;

-- Backfill is automatic due to DEFAULT, but let's ensure any NULLs are handled
-- (won't apply since NOT NULL with DEFAULT, but explicit for clarity)
UPDATE public.teams SET calendar_feed_token = gen_random_uuid() WHERE calendar_feed_token IS NULL;