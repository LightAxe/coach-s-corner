import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch cumulative season mileage for an athlete (by profile_id).
 * Includes both scheduled workout logs (where the workout belongs to the active season)
 * and personal workout logs (logged since the season was created).
 */
export function useSeasonMileage(profileId: string | undefined, seasonId: string | undefined) {
  return useQuery({
    queryKey: ['season-mileage', profileId, seasonId],
    queryFn: async () => {
      if (!profileId || !seasonId) return 0;

      // Get the season's created_at for bounding personal workouts
      const { data: season } = await supabase
        .from('seasons')
        .select('created_at')
        .eq('id', seasonId)
        .single();

      if (!season) return 0;

      // Find team_athlete IDs linked to this profile
      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('id')
        .eq('profile_id', profileId);

      const taIds = teamAthletes?.map((ta) => ta.id) || [];

      // 1. Scheduled workout logs where the workout is in this season
      const { data: scheduledLogs } = await supabase
        .from('workout_logs')
        .select('distance_value, distance_unit, scheduled_workouts!inner(season_id)')
        .eq('profile_id', profileId)
        .eq('scheduled_workouts.season_id', seasonId)
        .not('distance_value', 'is', null);

      // Also get scheduled logs via team_athlete_id (for coach-logged entries)
      let taScheduledLogs: typeof scheduledLogs = [];
      if (taIds.length > 0) {
        const { data } = await supabase
          .from('workout_logs')
          .select('distance_value, distance_unit, scheduled_workouts!inner(season_id)')
          .in('team_athlete_id', taIds)
          .is('profile_id', null)
          .eq('scheduled_workouts.season_id', seasonId)
          .not('distance_value', 'is', null);
        taScheduledLogs = data || [];
      }

      // 2. Personal workout logs since season start
      const { data: personalLogs } = await supabase
        .from('workout_logs')
        .select('distance_value, distance_unit')
        .eq('profile_id', profileId)
        .is('scheduled_workout_id', null)
        .gte('workout_date', season.created_at.split('T')[0])
        .not('distance_value', 'is', null);

      // Sum all miles
      const allLogs = [...(scheduledLogs || []), ...(taScheduledLogs || []), ...(personalLogs || [])];
      let totalMiles = 0;
      for (const log of allLogs) {
        const dist = log.distance_value ?? 0;
        totalMiles += log.distance_unit === 'km' ? dist * 0.621371 : dist;
      }

      return Math.round(totalMiles * 10) / 10;
    },
    enabled: !!profileId && !!seasonId,
  });
}
