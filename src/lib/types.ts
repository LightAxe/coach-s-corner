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

// Completion status for workout logs
export type CompletionStatus = Database['public']['Enums']['completion_status'];

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
