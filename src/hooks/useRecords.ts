import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecordEntry {
  team_athlete_id: string;
  distance_id: string;
  distance_name: string;
  best_time: number;
  achieved_at: string;
  race_name?: string;
}

// Fetch Personal Records (all-time best for each athlete/distance)
export function usePersonalRecords(teamId: string | undefined) {
  return useQuery({
    queryKey: ['records', 'personal', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      // Get team athletes first
      const { data: athletes, error: athleteError } = await supabase
        .from('team_athletes')
        .select('id')
        .eq('team_id', teamId);
      
      if (athleteError) throw athleteError;
      
      const athleteIds = athletes.map(a => a.id);
      if (athleteIds.length === 0) return [];
      
      // Get all race results for team athletes
      const { data: results, error: resultsError } = await supabase
        .from('race_results')
        .select(`
          id,
          team_athlete_id,
          time_seconds,
          distance_id,
          achieved_at,
          notes,
          race_id,
          races(name, race_date, distance_id, distances(id, name)),
          distances(id, name)
        `)
        .in('team_athlete_id', athleteIds);
      
      if (resultsError) throw resultsError;
      
      // Group by athlete and distance, find minimum time
      const recordsMap = new Map<string, RecordEntry>();
      
      for (const result of results) {
        // Determine distance from either the result itself (offseason) or the race
        const distanceId = result.distance_id || result.races?.distance_id;
        const distanceName = result.distances?.name || result.races?.distances?.name;
        const achievedAt = result.achieved_at || result.races?.race_date;
        const raceName = result.races?.name || result.notes;
        
        if (!distanceId || !distanceName || !achievedAt) continue;
        
        const key = `${result.team_athlete_id}-${distanceId}`;
        const existing = recordsMap.get(key);
        
        if (!existing || result.time_seconds < existing.best_time) {
          recordsMap.set(key, {
            team_athlete_id: result.team_athlete_id,
            distance_id: distanceId,
            distance_name: distanceName,
            best_time: Number(result.time_seconds),
            achieved_at: achievedAt,
            race_name: raceName || undefined,
          });
        }
      }
      
      return Array.from(recordsMap.values());
    },
    enabled: !!teamId,
  });
}

// Fetch Season Records (best for current season only)
export function useSeasonRecords(teamId: string | undefined, seasonId: string | undefined) {
  return useQuery({
    queryKey: ['records', 'season', teamId, seasonId],
    queryFn: async () => {
      if (!teamId || !seasonId) return [];
      
      // Get team athletes
      const { data: athletes, error: athleteError } = await supabase
        .from('team_athletes')
        .select('id')
        .eq('team_id', teamId);
      
      if (athleteError) throw athleteError;
      
      const athleteIds = athletes.map(a => a.id);
      if (athleteIds.length === 0) return [];
      
      // Get race results only for races in this season
      const { data: results, error: resultsError } = await supabase
        .from('race_results')
        .select(`
          id,
          team_athlete_id,
          time_seconds,
          race_id,
          races!inner(name, race_date, season_id, distance_id, distances(id, name))
        `)
        .in('team_athlete_id', athleteIds)
        .not('race_id', 'is', null);
      
      if (resultsError) throw resultsError;
      
      // Filter to current season and group by athlete/distance
      const recordsMap = new Map<string, RecordEntry>();
      
      for (const result of results) {
        if (result.races?.season_id !== seasonId) continue;
        
        const distanceId = result.races?.distance_id;
        const distanceName = result.races?.distances?.name;
        const achievedAt = result.races?.race_date;
        const raceName = result.races?.name;
        
        if (!distanceId || !distanceName || !achievedAt) continue;
        
        const key = `${result.team_athlete_id}-${distanceId}`;
        const existing = recordsMap.get(key);
        
        if (!existing || result.time_seconds < existing.best_time) {
          recordsMap.set(key, {
            team_athlete_id: result.team_athlete_id,
            distance_id: distanceId,
            distance_name: distanceName,
            best_time: Number(result.time_seconds),
            achieved_at: achievedAt,
            race_name: raceName || undefined,
          });
        }
      }
      
      return Array.from(recordsMap.values());
    },
    enabled: !!teamId && !!seasonId,
  });
}
