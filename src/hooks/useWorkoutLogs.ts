import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkoutLog, CompletionStatus, WorkoutType } from '@/lib/types';

export interface CreateWorkoutLogData {
  scheduled_workout_id: string;
  profile_id?: string | null;
  team_athlete_id?: string | null;
  logged_by?: string | null;
  completed: boolean;
  completion_status: CompletionStatus;
  effort_level?: number | null;
  how_felt?: string | null;
  notes?: string | null;
  distance_value?: number | null;
  distance_unit?: 'miles' | 'km' | null;
}

export interface PersonalWorkoutData {
  workout_date: string;
  workout_type: WorkoutType;
  profile_id?: string | null;
  team_athlete_id?: string | null;
  logged_by?: string | null;
  completed: boolean;
  completion_status: CompletionStatus;
  effort_level?: number | null;
  how_felt?: string | null;
  notes?: string | null;
  distance_value?: number | null;
  distance_unit?: 'miles' | 'km' | null;
}

export interface UpdateWorkoutLogData {
  id: string;
  completed?: boolean;
  completion_status?: CompletionStatus;
  effort_level?: number | null;
  how_felt?: string | null;
  notes?: string | null;
  distance_value?: number | null;
  distance_unit?: 'miles' | 'km' | null;
}

// Fetch a single workout log for a specific workout and profile
export function useWorkoutLogForProfile(scheduledWorkoutId?: string, profileId?: string) {
  return useQuery({
    queryKey: ['workout-log', scheduledWorkoutId, profileId],
    queryFn: async () => {
      if (!scheduledWorkoutId || !profileId) return null;
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('scheduled_workout_id', scheduledWorkoutId)
        .eq('profile_id', profileId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WorkoutLog | null;
    },
    enabled: !!scheduledWorkoutId && !!profileId,
  });
}

// Fetch workout log for a team athlete
export function useWorkoutLogForTeamAthlete(scheduledWorkoutId?: string, teamAthleteId?: string) {
  return useQuery({
    queryKey: ['workout-log', scheduledWorkoutId, 'team-athlete', teamAthleteId],
    queryFn: async () => {
      if (!scheduledWorkoutId || !teamAthleteId) return null;
      
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('scheduled_workout_id', scheduledWorkoutId)
        .eq('team_athlete_id', teamAthleteId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WorkoutLog | null;
    },
    enabled: !!scheduledWorkoutId && !!teamAthleteId,
  });
}

// Fetch all logs for a specific athlete (for training journal)
export function useAthleteWorkoutLogs(profileId?: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['athlete-workout-logs', profileId, options?.limit],
    queryFn: async () => {
      if (!profileId) return [];
      
      let query = supabase
        .from('workout_logs')
        .select(`
          *,
          scheduled_workouts (
            id,
            title,
            type,
            description,
            scheduled_date
          )
        `)
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

// Fetch logs for a team athlete (coach view)
export function useTeamAthleteWorkoutLogs(teamAthleteId?: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['team-athlete-workout-logs', teamAthleteId, options?.limit],
    queryFn: async () => {
      if (!teamAthleteId) return [];
      
      let query = supabase
        .from('workout_logs')
        .select(`
          *,
          scheduled_workouts (
            id,
            title,
            type,
            description,
            scheduled_date
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .order('created_at', { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!teamAthleteId,
  });
}

// Create a new workout log
export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWorkoutLogData) => {
      const { data: log, error } = await supabase
        .from('workout_logs')
        .insert({
          scheduled_workout_id: data.scheduled_workout_id,
          profile_id: data.profile_id,
          team_athlete_id: data.team_athlete_id,
          logged_by: data.logged_by,
          completed: data.completed,
          completion_status: data.completion_status,
          effort_level: data.effort_level,
          how_felt: data.how_felt,
          notes: data.notes,
          distance_value: data.distance_value,
          distance_unit: data.distance_unit,
        })
        .select()
        .single();
      
      if (error) throw error;
      return log;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-log', variables.scheduled_workout_id] });
      queryClient.invalidateQueries({ queryKey: ['athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-all-logs'] });
    },
  });
}

// Update an existing workout log
export function useUpdateWorkoutLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateWorkoutLogData) => {
      const { id, ...updates } = data;
      const { data: log, error } = await supabase
        .from('workout_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-log'] });
      queryClient.invalidateQueries({ queryKey: ['athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-all-logs'] });
    },
  });
}

// Delete a workout log
export function useDeleteWorkoutLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-log'] });
      queryClient.invalidateQueries({ queryKey: ['athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-all-logs'] });
      queryClient.invalidateQueries({ queryKey: ['personal-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['acwr'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-stats'] });
    },
  });
}

// Create a personal workout (not tied to a scheduled workout)
export function useCreatePersonalWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PersonalWorkoutData) => {
      const { data: log, error } = await supabase
        .from('workout_logs')
        .insert({
          scheduled_workout_id: null,
          workout_date: data.workout_date,
          workout_type: data.workout_type,
          profile_id: data.profile_id,
          team_athlete_id: data.team_athlete_id,
          logged_by: data.logged_by,
          completed: data.completed,
          completion_status: data.completion_status,
          effort_level: data.effort_level,
          how_felt: data.how_felt,
          notes: data.notes,
          distance_value: data.distance_value,
          distance_unit: data.distance_unit,
        })
        .select()
        .single();
      
      if (error) throw error;
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-all-logs'] });
      queryClient.invalidateQueries({ queryKey: ['personal-workout-logs'] });
      queryClient.invalidateQueries({ queryKey: ['acwr'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-stats'] });
    },
  });
}

// Fetch personal workout logs (not tied to scheduled workouts)
export function usePersonalWorkoutLogs(profileId?: string) {
  return useQuery({
    queryKey: ['personal-workout-logs', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profileId)
        .is('scheduled_workout_id', null)
        .not('workout_date', 'is', null)
        .order('workout_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

// Fetch personal workout logs for a team athlete (coach view)
export function useTeamAthletePersonalWorkoutLogs(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['team-athlete-personal-logs', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];

      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('team_athlete_id', teamAthleteId)
        .is('scheduled_workout_id', null)
        .not('workout_date', 'is', null)
        .order('workout_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!teamAthleteId,
  });
}

// Fetch all workout logs for a team athlete (unified training history)
export function useTeamAthleteAllWorkoutLogs(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['team-athlete-all-logs', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];

      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          scheduled_workouts (
            id,
            title,
            type,
            description,
            scheduled_date
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!teamAthleteId,
  });
}
