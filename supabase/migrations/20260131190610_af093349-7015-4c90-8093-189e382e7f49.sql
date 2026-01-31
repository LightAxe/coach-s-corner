-- Make distance_id nullable on races table
ALTER TABLE public.races ALTER COLUMN distance_id DROP NOT NULL;