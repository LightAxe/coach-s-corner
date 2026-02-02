import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, startOfDay } from 'date-fns';

interface AthleteStats {
  weeklyMiles: number;
  acwr: number | null;
  zone: 'undertraining' | 'optimal' | 'caution' | 'danger' | 'critical' | 'insufficient';
}

export type TeamAthleteStatsMap = Record<string, AthleteStats>;

// EWMA decay factors
const ACUTE_LAMBDA = 2 / (7 + 1);
const CHRONIC_LAMBDA = 2 / (28 + 1);

function calculateEWMA(values: number[], lambda: number): number {
  if (values.length === 0) return 0;
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }
  return ewma;
}

function getACWRZone(acwr: number | null): AthleteStats['zone'] {
  if (acwr === null) return 'insufficient';
  if (acwr < 0.8) return 'undertraining';
  if (acwr <= 1.3) return 'optimal';
  if (acwr <= 1.5) return 'caution';
  if (acwr <= 2.0) return 'danger';
  return 'critical';
}

export function useTeamAthleteStats(teamAthleteIds: string[]) {
  return useQuery({
    queryKey: ['team-athlete-stats', teamAthleteIds.sort().join(',')],
    queryFn: async (): Promise<TeamAthleteStatsMap> => {
      if (teamAthleteIds.length === 0) return {};

      const startDate = format(subDays(new Date(), 35), 'yyyy-MM-dd');
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      // Fetch scheduled workout logs
      const { data: scheduledLogs, error: scheduledError } = await supabase
        .from('workout_logs')
        .select(`
          id,
          team_athlete_id,
          distance_value,
          distance_unit,
          effort_level,
          scheduled_workouts!inner (
            scheduled_date
          )
        `)
        .in('team_athlete_id', teamAthleteIds)
        .not('scheduled_workout_id', 'is', null)
        .gte('scheduled_workouts.scheduled_date', startDate)
        .order('scheduled_workouts(scheduled_date)', { ascending: true });

      if (scheduledError) throw scheduledError;

      // Fetch personal workout logs (unscheduled)
      const { data: personalLogs, error: personalError } = await supabase
        .from('workout_logs')
        .select(`
          id,
          team_athlete_id,
          distance_value,
          distance_unit,
          effort_level,
          workout_date
        `)
        .in('team_athlete_id', teamAthleteIds)
        .is('scheduled_workout_id', null)
        .not('workout_date', 'is', null)
        .gte('workout_date', startDate)
        .order('workout_date', { ascending: true });

      if (personalError) throw personalError;

      // Build stats for each athlete
      const statsMap: TeamAthleteStatsMap = {};
      const today = startOfDay(new Date());

      for (const athleteId of teamAthleteIds) {
        // Process scheduled logs for this athlete
        const athleteScheduledLogs = (scheduledLogs || []).filter(l => l.team_athlete_id === athleteId);
        const athletePersonalLogs = (personalLogs || []).filter(l => l.team_athlete_id === athleteId);

        // Calculate weekly miles
        let weeklyMiles = 0;
        const dailyLoads: Map<string, number> = new Map();

        // Process scheduled workout logs
        for (const log of athleteScheduledLogs) {
          const workout = log.scheduled_workouts as { scheduled_date: string } | null;
          if (!workout?.scheduled_date) continue;

          const date = workout.scheduled_date;
          const distance = log.distance_value || 0;
          const rpe = log.effort_level || 5;

          // Convert to miles
          let distanceInMiles = distance;
          if (log.distance_unit === 'km') {
            distanceInMiles = distance * 0.621371;
          }

          // Weekly miles (last 7 days)
          if (date >= weekAgo) {
            weeklyMiles += distanceInMiles;
          }

          // Training load for ACWR
          const load = rpe * distanceInMiles;
          dailyLoads.set(date, (dailyLoads.get(date) || 0) + load);
        }

        // Process personal workout logs
        for (const log of athletePersonalLogs) {
          const date = log.workout_date;
          if (!date) continue;

          const distance = log.distance_value || 0;
          const rpe = log.effort_level || 5;

          let distanceInMiles = distance;
          if (log.distance_unit === 'km') {
            distanceInMiles = distance * 0.621371;
          }

          if (date >= weekAgo) {
            weeklyMiles += distanceInMiles;
          }

          const load = rpe * distanceInMiles;
          dailyLoads.set(date, (dailyLoads.get(date) || 0) + load);
        }

        // Build 35-day load array for ACWR
        const dailyLoadArray: number[] = [];
        for (let i = 34; i >= 0; i--) {
          const date = format(subDays(today, i), 'yyyy-MM-dd');
          dailyLoadArray.push(dailyLoads.get(date) || 0);
        }

        // Count days with data
        const daysWithData = dailyLoadArray.filter(d => d > 0).length;

        let acwr: number | null = null;
        if (daysWithData >= 7) {
          const currentAcute = calculateEWMA(dailyLoadArray.slice(-7), ACUTE_LAMBDA);
          const currentChronic = calculateEWMA(dailyLoadArray, CHRONIC_LAMBDA);
          if (currentChronic > 0) {
            acwr = Math.round((currentAcute / currentChronic) * 100) / 100;
          }
        }

        statsMap[athleteId] = {
          weeklyMiles: Math.round(weeklyMiles * 10) / 10,
          acwr,
          zone: getACWRZone(acwr),
        };
      }

      return statsMap;
    },
    enabled: teamAthleteIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
