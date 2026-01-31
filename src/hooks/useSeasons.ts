import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Season = Database['public']['Tables']['seasons']['Row'];

// Fetch all seasons for a team
export function useSeasons(teamId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Season[];
    },
    enabled: !!teamId,
  });
}

// Get active season for a team
export function useActiveSeason(teamId: string | undefined) {
  return useQuery({
    queryKey: ['active-season', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Season | null;
    },
    enabled: !!teamId,
  });
}

// Create a new season
export function useCreateSeason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      team_id: string; 
      name: string;
      created_by: string;
      is_active?: boolean;
    }) => {
      // If setting as active, first deactivate all other seasons
      if (data.is_active) {
        await supabase
          .from('seasons')
          .update({ is_active: false })
          .eq('team_id', data.team_id);
      }
      
      const { data: season, error } = await supabase
        .from('seasons')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return season;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['active-season', variables.team_id] });
    },
  });
}

// Set active season
export function useSetActiveSeason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ seasonId, teamId }: { seasonId: string; teamId: string }) => {
      // First deactivate all seasons for this team
      const { error: deactivateError } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('team_id', teamId);
      
      if (deactivateError) throw deactivateError;
      
      // Then activate the selected season
      const { data, error } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['active-season', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-athletes'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-workouts'] });
    },
  });
}

// Update season
export function useUpdateSeason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, teamId, name }: { id: string; teamId: string; name: string }) => {
      const { data, error } = await supabase
        .from('seasons')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['active-season', variables.teamId] });
    },
  });
}

// Delete season
export function useDeleteSeason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasons', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['active-season', variables.teamId] });
    },
  });
}
