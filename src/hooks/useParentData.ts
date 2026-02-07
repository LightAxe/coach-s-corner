import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface LinkedChild {
  id: string;
  team_athlete_id: string;
  team_athlete: {
    id: string;
    first_name: string;
    last_name: string;
    team_id: string;
    teams: {
      id: string;
      name: string;
    } | null;
  };
}

// Get all children linked to the current parent
export function useLinkedChildren() {
  const { user, isParent } = useAuth();

  return useQuery({
    queryKey: ['linked-children', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('parent_athlete_links')
        .select(`
          id,
          team_athlete_id,
          team_athletes!parent_athlete_links_team_athlete_fkey (
            id,
            first_name,
            last_name,
            team_id,
            teams (
              id,
              name
            )
          )
        `)
        .eq('parent_id', user.id);

      if (error) {
        console.error('Error fetching linked children:', error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map(link => ({
        id: link.id,
        team_athlete_id: link.team_athlete_id,
        team_athlete: link.team_athletes as LinkedChild['team_athlete'],
      }));
    },
    enabled: !!user && isParent,
  });
}

// Unlink a parent from a child
export function useUnlinkChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('parent_athlete_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-children'] });
    },
  });
}

// Generate a parent link code for an athlete (coach or athlete use)
export function useGenerateParentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamAthleteId: string) => {
      const { data, error } = await supabase.rpc('generate_parent_link_code', {
        _team_athlete_id: teamAthleteId,
      });

      if (error) {
        console.error('Error generating parent code:', error);
        throw error;
      }

      return data as string;
    },
    onSuccess: (_, teamAthleteId) => {
      queryClient.invalidateQueries({ queryKey: ['parent-codes', teamAthleteId] });
    },
  });
}

// Redeem a parent link code
export function useRedeemParentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_parent_link_code', {
        _code: code,
      });

      if (error) {
        console.error('Error redeeming parent code:', error);
        throw error;
      }

      return data as string; // Returns team_athlete_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-children'] });
    },
  });
}

// Get active parent codes for an athlete (for coaches/athletes to see)
export function useParentCodes(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['parent-codes', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];

      const { data, error } = await supabase
        .from('parent_link_codes')
        .select('*')
        .eq('team_athlete_id', teamAthleteId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching parent codes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!teamAthleteId,
  });
}

// Delete an unused parent code
export function useDeleteParentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ codeId, teamAthleteId }: { codeId: string; teamAthleteId: string }) => {
      const { error } = await supabase
        .from('parent_link_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      return teamAthleteId;
    },
    onSuccess: (teamAthleteId) => {
      queryClient.invalidateQueries({ queryKey: ['parent-codes', teamAthleteId] });
    },
  });
}

// Get workouts for a child's team
export function useChildWorkouts(teamId?: string) {
  return useQuery({
    queryKey: ['child-workouts', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('team_id', teamId)
        .gte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching child workouts:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!teamId,
  });
}

// Get workout logs for a specific team athlete
export function useChildWorkoutLogs(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['child-workout-logs', teamAthleteId],
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
            scheduled_date
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching child workout logs:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!teamAthleteId,
  });
}

// Get race results for a specific team athlete
export function useChildRaceResults(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['child-race-results', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];

      const { data, error } = await supabase
        .from('race_results')
        .select(`
          *,
          races (
            id,
            name,
            race_date,
            location
          ),
          distances (
            id,
            name
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .order('achieved_at', { ascending: false });

      if (error) {
        console.error('Error fetching child race results:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!teamAthleteId,
  });
}

// Get upcoming races for a child's team
export function useChildRaces(teamId?: string) {
  return useQuery({
    queryKey: ['child-races', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('races')
        .select(`
          *,
          distances (
            id,
            name
          )
        `)
        .eq('team_id', teamId)
        .gte('race_date', today)
        .order('race_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching child races:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!teamId,
  });
}

// Get parents linked to a specific team athlete (for athletes to see their linked parents)
export interface LinkedParent {
  id: string;
  parent_id: string;
  created_at: string;
  parent: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export function useLinkedParents(teamAthleteId?: string) {
  return useQuery({
    queryKey: ['linked-parents', teamAthleteId],
    queryFn: async () => {
      if (!teamAthleteId) return [];

      const { data, error } = await supabase
        .from('parent_athlete_links')
        .select(`
          id,
          parent_id,
          created_at,
          profiles!parent_athlete_links_parent_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching linked parents:', error);
        throw error;
      }

      // Transform to match interface
      return (data || []).map(link => ({
        id: link.id,
        parent_id: link.parent_id,
        created_at: link.created_at,
        parent: link.profiles as LinkedParent['parent'],
      }));
    },
    enabled: !!teamAthleteId,
  });
}
