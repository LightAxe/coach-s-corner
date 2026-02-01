-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_team_id ON public.audit_logs(team_id);
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only coaches can view audit logs for their teams
CREATE POLICY "Coaches can view team audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_team_coach(team_id, auth.uid()));

-- No direct inserts/updates/deletes - only via triggers
CREATE POLICY "No direct modifications"
  ON public.audit_logs FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_team_id UUID;
  audit_old JSONB;
  audit_new JSONB;
BEGIN
  -- Determine team_id based on the table
  IF TG_TABLE_NAME = 'team_athletes' THEN
    audit_team_id := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'scheduled_workouts' THEN
    audit_team_id := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'races' THEN
    audit_team_id := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'race_results' THEN
    -- Get team_id from team_athlete
    SELECT ta.team_id INTO audit_team_id 
    FROM team_athletes ta 
    WHERE ta.id = COALESCE(NEW.team_athlete_id, OLD.team_athlete_id);
  ELSIF TG_TABLE_NAME = 'workout_logs' THEN
    -- Get team_id from scheduled_workout
    SELECT sw.team_id INTO audit_team_id 
    FROM scheduled_workouts sw 
    WHERE sw.id = COALESCE(NEW.scheduled_workout_id, OLD.scheduled_workout_id);
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    audit_team_id := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'seasons' THEN
    audit_team_id := COALESCE(NEW.team_id, OLD.team_id);
  ELSIF TG_TABLE_NAME = 'parent_athlete_links' THEN
    -- Get team_id from team_athlete
    SELECT ta.team_id INTO audit_team_id 
    FROM team_athletes ta 
    WHERE ta.id = COALESCE(NEW.team_athlete_id, OLD.team_athlete_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build JSONB representations (excluding large/sensitive fields if needed)
  IF TG_OP = 'DELETE' THEN
    audit_old := to_jsonb(OLD);
    audit_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    audit_old := NULL;
    audit_new := to_jsonb(NEW);
  ELSE -- UPDATE
    audit_old := to_jsonb(OLD);
    audit_new := to_jsonb(NEW);
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, performed_by, team_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    audit_old,
    audit_new,
    auth.uid(),
    audit_team_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for important tables
CREATE TRIGGER audit_team_athletes
  AFTER INSERT OR UPDATE OR DELETE ON public.team_athletes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_scheduled_workouts
  AFTER INSERT OR UPDATE OR DELETE ON public.scheduled_workouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_races
  AFTER INSERT OR UPDATE OR DELETE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_race_results
  AFTER INSERT OR UPDATE OR DELETE ON public.race_results
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_workout_logs
  AFTER INSERT OR UPDATE OR DELETE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_announcements
  AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_seasons
  AFTER INSERT OR UPDATE OR DELETE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_parent_athlete_links
  AFTER INSERT OR UPDATE OR DELETE ON public.parent_athlete_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();