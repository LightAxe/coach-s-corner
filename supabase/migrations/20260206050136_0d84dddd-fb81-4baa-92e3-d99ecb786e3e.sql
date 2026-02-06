-- 1. Create the attendance_status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'excused', 'late');

-- 2. Create the attendance table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_athlete_id uuid NOT NULL REFERENCES public.team_athletes(id) ON DELETE CASCADE,
  date date NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  note text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One record per athlete per day per team
  UNIQUE (team_id, team_athlete_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Coaches can select attendance for their team
CREATE POLICY "Coaches can view team attendance"
  ON public.attendance FOR SELECT
  USING (is_team_coach(team_id, auth.uid()));

-- Coaches can insert attendance for their team
CREATE POLICY "Coaches can create attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (is_team_coach(team_id, auth.uid()));

-- Coaches can update attendance for their team
CREATE POLICY "Coaches can update attendance"
  ON public.attendance FOR UPDATE
  USING (is_team_coach(team_id, auth.uid()));

-- Coaches can delete attendance for their team
CREATE POLICY "Coaches can delete attendance"
  ON public.attendance FOR DELETE
  USING (is_team_coach(team_id, auth.uid()));

-- Athletes can view their own attendance (via team_athletes.profile_id)
CREATE POLICY "Athletes can view own attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_athletes ta
      WHERE ta.id = attendance.team_athlete_id
        AND ta.profile_id = auth.uid()
    )
  );

-- Parents can view attendance for their linked athletes
CREATE POLICY "Parents can view linked athlete attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_athlete_links pal
      WHERE pal.parent_id = auth.uid()
        AND pal.team_athlete_id = attendance.team_athlete_id
    )
  );

-- Add index for common queries
CREATE INDEX idx_attendance_team_date ON public.attendance(team_id, date);
CREATE INDEX idx_attendance_athlete_date ON public.attendance(team_athlete_id, date);