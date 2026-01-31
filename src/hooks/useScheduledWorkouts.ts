import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkoutType } from '@/lib/types';

interface CreateWorkoutData {
  team_id: string;
  created_by: string;
  title: string;
  type: WorkoutType;
  distance: string | null;
  description: string | null;
  athlete_notes: string | null;
  scheduled_date: string;
  season_id: string | null;
}

interface ScheduleFromTemplateData {
  template_id: string;
  team_id: string;
  created_by: string;
  scheduled_date: string;
  season_id: string | null;
}

// Create a new scheduled workout (ad-hoc)
export function useCreateScheduledWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWorkoutData) => {
      const { data: workout, error } = await supabase
        .from('scheduled_workouts')
        .insert({
          team_id: data.team_id,
          created_by: data.created_by,
          title: data.title,
          type: data.type,
          distance: data.distance,
          description: data.description,
          athlete_notes: data.athlete_notes,
          scheduled_date: data.scheduled_date,
          season_id: data.season_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return workout;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['today-workout', variables.team_id] });
    },
  });
}

// Schedule a workout from a template
export function useScheduleFromTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ScheduleFromTemplateData) => {
      // First fetch the template
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', data.template_id)
        .single();
      
      if (templateError) throw templateError;
      
      // Create scheduled workout from template
      const { data: workout, error } = await supabase
        .from('scheduled_workouts')
        .insert({
          team_id: data.team_id,
          created_by: data.created_by,
          title: template.name,
          type: template.type,
          distance: template.distance,
          description: template.description,
          athlete_notes: template.athlete_notes,
          scheduled_date: data.scheduled_date,
          season_id: data.season_id,
          template_id: data.template_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return workout;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['today-workout', variables.team_id] });
    },
  });
}

// Update a scheduled workout
export function useUpdateScheduledWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      team_id, 
      ...updates 
    }: { 
      id: string; 
      team_id: string;
      title?: string;
      type?: WorkoutType;
      distance?: string | null;
      description?: string | null;
      athlete_notes?: string | null;
      scheduled_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['today-workout', variables.team_id] });
    },
  });
}

// Delete a scheduled workout
export function useDeleteScheduledWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['today-workout', variables.team_id] });
    },
  });
}
