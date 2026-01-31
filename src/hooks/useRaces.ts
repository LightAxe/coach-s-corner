import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Race, RaceWithDistance } from '@/lib/types';

interface CreateRaceData {
  team_id: string;
  season_id: string | null;
  name: string;
  race_date: string;
  distance_id?: string;
  location?: string;
  details?: string;
  transportation_info?: string;
  map_link?: string;
  results_link?: string;
  created_by: string;
}

interface UpdateRaceData {
  id: string;
  team_id: string;
  name?: string;
  race_date?: string;
  distance_id?: string;
  location?: string;
  details?: string;
  transportation_info?: string;
  map_link?: string;
  results_link?: string;
}

// Fetch all races for a team
export function useRaces(teamId: string | undefined) {
  return useQuery({
    queryKey: ['races', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('races')
        .select('*, distances(*)')
        .eq('team_id', teamId)
        .order('race_date', { ascending: false });
      
      if (error) throw error;
      return data as RaceWithDistance[];
    },
    enabled: !!teamId,
  });
}

// Fetch races for a date range (for calendar)
export function useRacesRange(teamId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['races', teamId, startDate, endDate],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('races')
        .select('*, distances(*)')
        .eq('team_id', teamId)
        .gte('race_date', startDate)
        .lte('race_date', endDate)
        .order('race_date');
      
      if (error) throw error;
      return data as RaceWithDistance[];
    },
    enabled: !!teamId,
  });
}

// Fetch a single race by ID
export function useRace(raceId: string | undefined) {
  return useQuery({
    queryKey: ['race', raceId],
    queryFn: async () => {
      if (!raceId) return null;
      
      const { data, error } = await supabase
        .from('races')
        .select('*, distances(*)')
        .eq('id', raceId)
        .single();
      
      if (error) throw error;
      return data as RaceWithDistance;
    },
    enabled: !!raceId,
  });
}

// Create a new race
export function useCreateRace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateRaceData) => {
      const { data: race, error } = await supabase
        .from('races')
        .insert({
          team_id: data.team_id,
          season_id: data.season_id,
          name: data.name,
          race_date: data.race_date,
          distance_id: data.distance_id || null,
          location: data.location || null,
          details: data.details || null,
          transportation_info: data.transportation_info || null,
          map_link: data.map_link || null,
          results_link: data.results_link || null,
          created_by: data.created_by,
        })
        .select()
        .single();
      
      if (error) throw error;
      return race as RaceWithDistance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['races', variables.team_id] });
    },
  });
}

// Update an existing race
export function useUpdateRace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id, ...updates }: UpdateRaceData) => {
      const { data, error } = await supabase
        .from('races')
        .update(updates)
        .eq('id', id)
        .select('*, distances(*)')
        .single();
      
      if (error) throw error;
      return data as RaceWithDistance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['races', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['race', variables.id] });
    },
  });
}

// Delete a race
export function useDeleteRace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['races', variables.team_id] });
    },
  });
}
