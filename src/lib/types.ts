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
export type PR = Database['public']['Tables']['prs']['Row'];

// Completion status for workout logs
export type CompletionStatus = Database['public']['Enums']['completion_status'];

// Distance is now a text field for flexibility
export type DistanceType = string;
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

// PR with athlete info (for leaderboards)
export type PRWithAthlete = PR & {
  profiles?: Profile | null;
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

// Format seconds to MM:SS or H:MM:SS
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse MM:SS or H:MM:SS to seconds
export function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

// Distance labels - now just returns the distance name as-is
// since distances are user-defined text
export const distanceLabels: Record<string, string> = {};

// Helper to get display label for a distance (just returns the name)
export function getDistanceLabel(distance: string): string {
  return distance;
}
