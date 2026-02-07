import type { Database } from '@/integrations/supabase/types';

// Database row types
export type ScheduledWorkout = Database['public']['Tables']['scheduled_workouts']['Row'];
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'] & {
  priority: 'normal' | 'important';
};
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type TeamMembership = Database['public']['Tables']['team_memberships']['Row'];
export type TeamAthlete = Database['public']['Tables']['team_athletes']['Row'];
export type Season = Database['public']['Tables']['seasons']['Row'];
export type Distance = Database['public']['Tables']['distances']['Row'];
export type Race = Database['public']['Tables']['races']['Row'];
export type RaceResult = Database['public']['Tables']['race_results']['Row'];

// Completion status for workout logs
export type CompletionStatus = Database['public']['Enums']['completion_status'];

// Attendance
export type Attendance = Database['public']['Tables']['attendance']['Row'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];

// Team athlete with optional profile data
export type TeamAthleteWithProfile = TeamAthlete & {
  profiles?: Profile | null;
};

// Workout type enum from database
export type WorkoutType = Database['public']['Enums']['workout_type'];

// Extended types with relationships
export type TeamMemberWithProfile = TeamMembership & {
  profiles: Profile;
};

// Race with distance joined (distance may be null)
export type RaceWithDistance = Race & {
  distances?: Distance | null;
};

// Race result with optional relationships
export type RaceResultWithRelations = RaceResult & {
  distances?: Distance | null;
  races?: RaceWithDistance | null;
  team_athletes?: TeamAthlete | null;
};

// Helper function for workout type badge styling
export function getWorkoutTypeBadgeClass(type: WorkoutType): string {
  const classes: Record<WorkoutType, string> = {
    easy: 'border-workout-easy text-workout-easy',
    tempo: 'border-workout-tempo text-workout-tempo',
    interval: 'border-workout-interval text-workout-interval',
    long: 'border-workout-long text-workout-long',
    rest: 'border-workout-rest text-workout-rest',
    race: 'border-accent text-accent',
    other: 'border-muted-foreground text-muted-foreground',
  };
  return classes[type] || classes.other;
}

// Format seconds to MM:SS.cc or H:MM:SS.cc (with centiseconds)
export function formatTime(seconds: number): string {
  // Round to nearest centisecond first to handle carry-over correctly
  const totalCentiseconds = Math.round(seconds * 100);
  const cs = totalCentiseconds % 100;
  const totalSecs = Math.floor(totalCentiseconds / 100);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const centisStr = cs.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisStr}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}.${centisStr}`;
}

// Parse MM:SS.cc or H:MM:SS.cc to decimal seconds
export function parseTimeToSeconds(time: string): number {
  const trimmed = time.trim();
  if (!trimmed) return NaN;

  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return NaN;

  const nums = parts.map(p => parseFloat(p));
  if (nums.some(n => isNaN(n) || n < 0)) return NaN;

  let seconds = 0;
  if (parts.length === 3) {
    // H:MM:SS or H:MM:SS.cc
    const [h, m, s] = nums;
    if (h > 23 || m > 59 || s >= 60) return NaN;
    seconds = h * 3600 + m * 60 + s;
  } else {
    // MM:SS or MM:SS.cc
    const [m, s] = nums;
    if (m > 999 || s >= 60) return NaN;
    seconds = m * 60 + s;
  }

  return Math.round(seconds * 100) / 100; // Round to 2 decimals
}

// Helper to get display label for a distance
export function getDistanceLabel(distance: Distance): string {
  return distance.name;
}
