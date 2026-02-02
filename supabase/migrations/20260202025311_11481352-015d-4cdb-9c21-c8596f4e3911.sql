-- Allow workout_logs without a scheduled workout for personal/historical logging
ALTER TABLE workout_logs
  ALTER COLUMN scheduled_workout_id DROP NOT NULL;

-- Add date field for unscheduled workouts
ALTER TABLE workout_logs
  ADD COLUMN workout_date DATE;

-- Add workout_type for personal workouts (scheduled workouts have type on the scheduled_workout record)
ALTER TABLE workout_logs
  ADD COLUMN workout_type public.workout_type DEFAULT NULL;

-- Create index for efficient querying of personal workouts by date
CREATE INDEX idx_workout_logs_workout_date ON workout_logs(workout_date) WHERE workout_date IS NOT NULL;

-- Update RLS policies to allow athletes to create personal workout logs
DROP POLICY IF EXISTS "Athletes can create own workout logs" ON workout_logs;
CREATE POLICY "Athletes can create own workout logs"
  ON workout_logs
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() AND
    (scheduled_workout_id IS NOT NULL OR workout_date IS NOT NULL)
  );

-- Update the coach insert policy to handle personal workouts too
DROP POLICY IF EXISTS "Coaches can create team athlete workout logs" ON workout_logs;
CREATE POLICY "Coaches can create team athlete workout logs"
  ON workout_logs
  FOR INSERT
  WITH CHECK (
    (profile_id IS NOT NULL AND profile_id = auth.uid()) OR
    (team_athlete_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_athletes ta
      WHERE ta.id = workout_logs.team_athlete_id
      AND is_team_coach(ta.team_id, auth.uid())
    ))
  );