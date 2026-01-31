import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PRWithAthlete } from '@/lib/types';

// Fetch PRs for the team (all-time personal records)
export function useTeamPRs(teamId: string | undefined, distanceFilter?: string) {
  return useQuery({
    queryKey: ['team-prs', teamId, distanceFilter],
    queryFn: async () => {
      if (!teamId) return [];
      
      // Get team athlete IDs for this team
      const { data: teamAthletes, error: athleteError } = await supabase
        .from('team_athletes')
        .select('id, profile_id')
        .eq('team_id', teamId);
      
      if (athleteError) throw athleteError;
      
      const teamAthleteIds = teamAthletes.map(a => a.id);
      const profileIds = teamAthletes.map(a => a.profile_id).filter(Boolean) as string[];
      
      // Build query for PRs
      let query = supabase
        .from('prs')
        .select('*, profiles(*), team_athletes(*)');
      
      // Filter by distance if specified
      if (distanceFilter) {
        query = query.eq('distance', distanceFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter to only include PRs for this team's athletes
      const teamPRs = (data as PRWithAthlete[]).filter(pr => 
        (pr.profile_id && profileIds.includes(pr.profile_id)) ||
        (pr.team_athlete_id && teamAthleteIds.includes(pr.team_athlete_id))
      );
      
      return teamPRs;
    },
    enabled: !!teamId,
  });
}

// Fetch Season Records (PRs achieved during a specific season)
export function useSeasonRecords(teamId: string | undefined, seasonId: string | undefined, distanceFilter?: string) {
  return useQuery({
    queryKey: ['season-records', teamId, seasonId, distanceFilter],
    queryFn: async () => {
      if (!teamId || !seasonId) return [];
      
      let query = supabase
        .from('prs')
        .select('*, profiles(*), team_athletes(*)')
        .eq('season_id', seasonId);
      
      if (distanceFilter) {
        query = query.eq('distance', distanceFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PRWithAthlete[];
    },
    enabled: !!teamId && !!seasonId,
  });
}

// Fetch unique distances that have PRs for this team
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
        .select('distance, profile_id, team_athlete_id');
      
      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }
      
      const { data: prs, error: prError } = await query;
      
      if (prError) throw prError;
      
      // Filter to team's PRs
      const teamPRs = prs.filter(pr => 
        (pr.profile_id && profileIds.includes(pr.profile_id)) ||
        (pr.team_athlete_id && teamAthleteIds.includes(pr.team_athlete_id))
      );
      
      // Get unique distances
      const uniqueDistances = [...new Set(teamPRs.map(pr => pr.distance))].filter(Boolean);
      
      return uniqueDistances.sort();
    },
    enabled: !!teamId,
  });
}

// Get best time per athlete for a distance (for leaderboard)
export function usePRLeaderboard(teamId: string | undefined, distance: string, seasonId?: string) {
  return useQuery({
    queryKey: ['pr-leaderboard', teamId, distance, seasonId],
    queryFn: async () => {
      if (!teamId || !distance) return [];
      
      // Get team athletes
      const { data: teamAthletes, error: athleteError } = await supabase
        .from('team_athletes')
        .select('*, profiles(*)')
        .eq('team_id', teamId);
      
      if (athleteError) throw athleteError;
      
      // Build PR query
      let prQuery = supabase
        .from('prs')
        .select('*, profiles(*), team_athletes(*)')
        .eq('distance', distance)
        .order('time_seconds', { ascending: true });
      
      // If season specified, filter by season
      if (seasonId) {
        prQuery = prQuery.eq('season_id', seasonId);
      }
      
      const { data: prs, error: prError } = await prQuery;
      
      if (prError) throw prError;
      
      const teamAthleteIds = teamAthletes.map(a => a.id);
      const profileIds = teamAthletes.map(a => a.profile_id).filter(Boolean) as string[];
      
      // Filter to team's athletes and get best time per athlete
      const athleteBestTimes = new Map<string, PRWithAthlete>();
      
      for (const pr of prs as PRWithAthlete[]) {
        const athleteKey = pr.team_athlete_id || pr.profile_id;
        if (!athleteKey) continue;
        
        // Check if this PR belongs to a team athlete
        const isTeamAthlete = 
          (pr.team_athlete_id && teamAthleteIds.includes(pr.team_athlete_id)) ||
          (pr.profile_id && profileIds.includes(pr.profile_id));
        
        if (!isTeamAthlete) continue;
        
        // Only keep the best (first due to ordering) time for each athlete
        if (!athleteBestTimes.has(athleteKey)) {
          athleteBestTimes.set(athleteKey, pr);
        }
      }
      
      return Array.from(athleteBestTimes.values());
    },
    enabled: !!teamId && !!distance,
  });
}
