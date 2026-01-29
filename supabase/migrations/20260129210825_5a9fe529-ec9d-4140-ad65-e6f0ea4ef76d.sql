-- Add priority column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN priority text NOT NULL DEFAULT 'normal';

-- Add check constraint for valid values
ALTER TABLE public.announcements 
ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('normal', 'important'));