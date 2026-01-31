import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamWithCodes {
  id: string;
  name: string;
  join_code: string;
  coach_invite_code: string | null;
}

// Fetch team with join codes
export function useTeamWithCodes(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-codes', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, join_code, coach_invite_code')
        .eq('id', teamId!)
        .single();
      if (error) throw error;
      return data as TeamWithCodes;
    },
    enabled: !!teamId,
  });
}

// Regenerate a team code
export function useRegenerateTeamCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, codeType }: { teamId: string; codeType: 'athlete' | 'coach' }) => {
      const { data, error } = await supabase.rpc('regenerate_team_code', {
        _team_id: teamId,
        _code_type: codeType,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-codes', variables.teamId] });
    },
  });
}

// Generate coach invite code (creates if doesn't exist)
export function useGenerateCoachInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase.rpc('generate_coach_invite_code', {
        _team_id: teamId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: ['team-codes', teamId] });
    },
  });
}

// Fetch unlinked team members (signed up but not linked to team_athletes)
export function useUnlinkedTeamMembers(teamId: string | undefined, seasonId?: string | null) {
  return useQuery({
    queryKey: ['unlinked-members', teamId, seasonId],
    queryFn: async () => {
      // Get all athlete team memberships
      const { data: athleteMembers, error: membersError } = await supabase
        .from('team_memberships')
        .select(`
          id,
          profile_id,
          profiles!team_memberships_profile_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('team_id', teamId!)
        .eq('role', 'athlete');

      if (membersError) throw membersError;

      // Get all linked team_athletes profile_ids
      let teamAthletesQuery = supabase
        .from('team_athletes')
        .select('profile_id')
        .eq('team_id', teamId!)
        .not('profile_id', 'is', null);

      if (seasonId) {
        teamAthletesQuery = teamAthletesQuery.eq('season_id', seasonId);
      }

      const { data: linkedAthletes, error: athletesError } = await teamAthletesQuery;
      if (athletesError) throw athletesError;

      const linkedProfileIds = new Set(linkedAthletes?.map(a => a.profile_id) || []);

      // Return members whose profile_id is not linked to any team_athlete
      return (athleteMembers || [])
        .filter(m => !linkedProfileIds.has(m.profile_id))
        .map(m => ({
          membershipId: m.id,
          profileId: m.profile_id,
          firstName: m.profiles?.first_name || '',
          lastName: m.profiles?.last_name || '',
          email: m.profiles?.email || '',
        }));
    },
    enabled: !!teamId,
  });
}
