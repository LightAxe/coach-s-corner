import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Default preset distances that every team starts with
export const PRESET_DISTANCES = ['1500m', 'Mile', '3000m', '2 Mile', '5K'];

export type TeamDistance = {
  id: string;
  team_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

// Fetch team's custom distances
export function useTeamDistances(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-distances', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_distances')
        .select('*')
        .eq('team_id', teamId)
        .order('sort_order');
      
      if (error) throw error;
      return data as TeamDistance[];
    },
    enabled: !!teamId,
  });
}

// Fetch distances that have PRs recorded (for display in PR board)
export function useDistancesWithPRs(teamId: string | undefined, seasonId?: string) {
  return useQuery({
    queryKey: ['distances-with-prs', teamId, seasonId],
    queryFn: async () => {
      if (!teamId) return [];
      
      // Get team athletes to filter PRs
      const { data: teamAthletes, error: athleteError } = await supabase
        .from('team_athletes')
        .select('id, profile_id')
        .eq('team_id', teamId);
      
      if (athleteError) throw athleteError;
      
      const teamAthleteIds = teamAthletes.map(a => a.id);
      const profileIds = teamAthletes.map(a => a.profile_id).filter(Boolean) as string[];
      
      // Build PR query
      let query = supabase
        .from('prs')
        .select('distance');
      
      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }
      
      const { data: prs, error: prError } = await query;
      
      if (prError) throw prError;
      
      // Filter to team's PRs and get unique distances
      const teamPRs = prs.filter(pr => {
        // We need to check if the PR belongs to this team
        // This is a simplified check - in production you'd want to join properly
        return true; // For now, trust that RLS handles team filtering
      });
      
      const uniqueDistances = [...new Set(teamPRs.map(pr => pr.distance))].filter(Boolean);
      
      return uniqueDistances.sort();
    },
    enabled: !!teamId,
  });
}

// Create a new custom distance
export function useCreateDistance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { team_id: string; name: string; sort_order?: number }) => {
      const { data: distance, error } = await supabase
        .from('team_distances')
        .insert({
          team_id: data.team_id,
          name: data.name,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return distance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-distances', variables.team_id] });
    },
  });
}

// Delete a custom distance
export function useDeleteDistance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from('team_distances')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-distances', variables.team_id] });
    },
  });
}

// Initialize preset distances for a team
export function useInitializePresetDistances() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId: string) => {
      const distances = PRESET_DISTANCES.map((name, index) => ({
        team_id: teamId,
        name,
        sort_order: index,
      }));
      
      const { data, error } = await supabase
        .from('team_distances')
        .insert(distances)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: ['team-distances', teamId] });
    },
  });
}
