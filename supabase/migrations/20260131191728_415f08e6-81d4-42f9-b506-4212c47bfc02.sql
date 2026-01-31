-- Add distance tracking columns to workout_logs
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS distance_value NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS distance_unit TEXT DEFAULT 'miles';

-- Add check constraint for distance unit
ALTER TABLE public.workout_logs 
ADD CONSTRAINT workout_logs_distance_unit_check 
CHECK (distance_unit IS NULL OR distance_unit IN ('miles', 'km'));

-- Remove distance from scheduled_workouts (coaches use description/athlete_notes instead)
ALTER TABLE public.scheduled_workouts DROP COLUMN IF EXISTS distance;