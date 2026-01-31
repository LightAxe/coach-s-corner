import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RaceResult, RaceResultWithRelations } from '@/lib/types';

interface CreateRaceResultData {
  race_id?: string;
  team_athlete_id: string;
  time_seconds: number;
  place?: number;
  distance_id?: string;  // Required if race_id is null (offseason)
  achieved_at?: string;  // Required if race_id is null (offseason)
  notes?: string;
  created_by: string;
}


// Fetch results for a specific race
export function useRaceResults(raceId: string | undefined) {
  return useQuery({
    queryKey: ['race-results', raceId],
    queryFn: async () => {
      if (!raceId) return [];
      
      const { data, error } = await supabase
        .from('race_results')
        .select('*, team_athletes(*, profiles(*))')
        .eq('race_id', raceId)
        .order('time_seconds');
      
      if (error) throw error;
      return data;
    },
    enabled: !!raceId,
  });
}

// Fetch all results for a team athlete
export function useAthleteResults(teamAthleteId: string | undefined) {
  return useQuery({
    queryKey: ['athlete-results', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];
      
      const { data, error } = await supabase
        .from('race_results')
        .select('*, races(*, distances(*)), distances(*)')
        .eq('team_athlete_id', teamAthleteId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RaceResultWithRelations[];
    },
    enabled: !!teamAthleteId,
  });
}

// Create a race result
export function useCreateRaceResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateRaceResultData) => {
      const { data: result, error } = await supabase
        .from('race_results')
        .insert({
          race_id: data.race_id || null,
          team_athlete_id: data.team_athlete_id,
          time_seconds: data.time_seconds,
          place: data.place || null,
          distance_id: data.distance_id || null,
          achieved_at: data.achieved_at || null,
          notes: data.notes || null,
          created_by: data.created_by,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as RaceResult;
    },
    onSuccess: (_, variables) => {
      if (variables.race_id) {
        queryClient.invalidateQueries({ queryKey: ['race-results', variables.race_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['athlete-results', variables.team_athlete_id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

// Batch create race results (for entering multiple athletes at once)
export function useCreateRaceResults() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (results: CreateRaceResultData[]) => {
      const { data, error } = await supabase
        .from('race_results')
        .insert(
          results.map(r => ({
            race_id: r.race_id || null,
            team_athlete_id: r.team_athlete_id,
            time_seconds: r.time_seconds,
            place: r.place || null,
            distance_id: r.distance_id || null,
            achieved_at: r.achieved_at || null,
            notes: r.notes || null,
            created_by: r.created_by,
          }))
        )
        .select();
      
      if (error) throw error;
      return data as RaceResult[];
    },
    onSuccess: (_, variables) => {
      const raceId = variables[0]?.race_id;
      if (raceId) {
        queryClient.invalidateQueries({ queryKey: ['race-results', raceId] });
      }
      variables.forEach(v => {
        queryClient.invalidateQueries({ queryKey: ['athlete-results', v.team_athlete_id] });
      });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

// Update a race result
export function useUpdateRaceResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRaceResultData) => {
      const { data, error } = await supabase
        .from('race_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as RaceResult;
    },
    onSuccess: (result) => {
      if (result.race_id) {
        queryClient.invalidateQueries({ queryKey: ['race-results', result.race_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['athlete-results', result.team_athlete_id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

interface UpdateRaceResultData {
  id: string;
  time_seconds?: number;
  place?: number;
  distance_id?: string;
  notes?: string;
}

// Delete a race result
export function useDeleteRaceResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, race_id, team_athlete_id }: { id: string; race_id?: string; team_athlete_id: string }) => {
      const { error } = await supabase
        .from('race_results')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      if (variables.race_id) {
        queryClient.invalidateQueries({ queryKey: ['race-results', variables.race_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['athlete-results', variables.team_athlete_id] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}
