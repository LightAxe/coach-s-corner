import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TeamAthlete, TeamAthleteWithProfile } from '@/lib/types';

// Fetch all team athletes (optionally filter by season)
export function useTeamAthletes(teamId: string | undefined, seasonId?: string | null) {
  return useQuery({
    queryKey: ['team-athletes', teamId, seasonId],
    queryFn: async () => {
      let query = supabase
        .from('team_athletes')
        .select(`
          *,
          profiles!team_athletes_profile_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            role
          )
        `)
        .eq('team_id', teamId!)
        .order('last_name');
      
      // If season specified, filter by it
      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TeamAthleteWithProfile[];
    },
    enabled: !!teamId,
  });
}

// Fetch unlinked shell athletes (for linking dialog)
export function useUnlinkedTeamAthletes(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-athletes', teamId, 'unlinked'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_athletes')
        .select('*')
        .eq('team_id', teamId!)
        .is('profile_id', null)
        .order('last_name');
      if (error) throw error;
      return data as TeamAthlete[];
    },
    enabled: !!teamId,
  });
}

// Create a shell athlete
export function useCreateTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { 
      team_id: string; 
      first_name: string; 
      last_name: string;
      created_by: string;
      season_id?: string | null;
    }) => {
      const { data: athlete, error } = await supabase
        .from('team_athletes')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return athlete;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}

// Link a profile to a team athlete
export function useLinkTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, team_id, profile_id }: { 
      id: string;
      team_id: string;
      profile_id: string;
    }) => {
      const { data, error } = await supabase
        .from('team_athletes')
        .update({ profile_id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}

// Update a team athlete's info
export function useUpdateTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, team_id, first_name, last_name }: { 
      id: string;
      team_id: string;
      first_name: string;
      last_name: string;
    }) => {
      const { data, error } = await supabase
        .from('team_athletes')
        .update({ first_name, last_name })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}

// Delete a team athlete
export function useDeleteTeamAthlete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from('team_athletes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['team-athletes', variables.team_id] 
      });
    },
  });
}

// Create or update workout log for a team athlete
export function useCreateTeamAthleteWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      scheduled_workout_id: string;
      team_athlete_id: string;
      completion_status: 'none' | 'partial' | 'complete';
      effort_level?: number | null;
      notes?: string | null;
      logged_by: string;
    }) => {
      // Check if log already exists for this athlete and workout
      const { data: existing } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('scheduled_workout_id', data.scheduled_workout_id)
        .eq('team_athlete_id', data.team_athlete_id)
        .maybeSingle();

      if (existing) {
        // Update existing log
        const { data: log, error } = await supabase
          .from('workout_logs')
          .update({
            completion_status: data.completion_status,
            effort_level: data.effort_level,
            notes: data.notes,
            logged_by: data.logged_by,
            completed: data.completion_status !== 'none',
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return log;
      } else {
        // Create new log
        const { data: log, error } = await supabase
          .from('workout_logs')
          .insert({
            scheduled_workout_id: data.scheduled_workout_id,
            team_athlete_id: data.team_athlete_id,
            completion_status: data.completion_status,
            effort_level: data.effort_level,
            notes: data.notes,
            logged_by: data.logged_by,
            completed: data.completion_status !== 'none',
          })
          .select()
          .single();
        if (error) throw error;
        return log;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
    },
  });
}

// Fetch workout logs for a specific workout (all athletes)
export function useWorkoutLogsForWorkout(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['workout-logs', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          team_athletes (
            id,
            first_name,
            last_name,
            profile_id
          )
        `)
        .eq('scheduled_workout_id', workoutId!);
      if (error) throw error;
      return data;
    },
    enabled: !!workoutId,
  });
}
