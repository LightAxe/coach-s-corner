import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, parseISO, startOfDay } from 'date-fns';

interface DailyLoad {
  date: string;
  load: number;
}

interface ACWRData {
  acwr: number | null;
  acuteLoad: number;
  chronicLoad: number;
  zone: 'undertraining' | 'optimal' | 'caution' | 'danger' | 'critical' | 'insufficient';
  trend: DailyLoad[];
  acwrHistory: { date: string; acwr: number }[];
  daysWithData: number;
}

// EWMA decay factors: λ = 2 / (N + 1)
const ACUTE_LAMBDA = 2 / (7 + 1);   // 0.25 for 7-day acute
const CHRONIC_LAMBDA = 2 / (28 + 1); // ~0.069 for 28-day chronic

function calculateEWMA(values: number[], lambda: number): number {
  if (values.length === 0) return 0;

  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
  }
  return ewma;
}

function getACWRZone(acwr: number | null): ACWRData['zone'] {
  if (acwr === null) return 'insufficient';
  if (acwr < 0.8) return 'undertraining';
  if (acwr <= 1.3) return 'optimal';
  if (acwr <= 1.5) return 'caution';
  if (acwr <= 2.0) return 'danger';
  return 'critical';
}

export function useACWR(teamAthleteId: string | undefined) {
  return useQuery({
    queryKey: ['acwr', teamAthleteId],
    queryFn: async (): Promise<ACWRData> => {
      if (!teamAthleteId) {
        return {
          acwr: null,
          acuteLoad: 0,
          chronicLoad: 0,
          zone: 'insufficient',
          trend: [],
          acwrHistory: [],
          daysWithData: 0,
        };
      }

      // Fetch last 35 days of workout logs (28 for chronic + 7 buffer)
      const startDate = format(subDays(new Date(), 35), 'yyyy-MM-dd');

      const { data: logs, error } = await supabase
        .from('workout_logs')
        .select(`
          id,
          distance_value,
          distance_unit,
          effort_level,
          created_at,
          scheduled_workouts!inner (
            scheduled_date
          )
        `)
        .eq('team_athlete_id', teamAthleteId)
        .gte('scheduled_workouts.scheduled_date', startDate)
        .order('scheduled_workouts(scheduled_date)', { ascending: true });

      if (error) throw error;

      // Build daily load map
      const dailyLoads: Map<string, number> = new Map();

      for (const log of logs || []) {
        const workout = log.scheduled_workouts as { scheduled_date: string } | null;
        if (!workout?.scheduled_date) continue;

        const date = workout.scheduled_date;
        const distance = log.distance_value || 0;
        const rpe = log.effort_level || 5; // Default to moderate effort if not logged

        // Convert km to miles if needed for consistency
        let distanceInMiles = distance;
        if (log.distance_unit === 'km') {
          distanceInMiles = distance * 0.621371;
        }

        // Training load = RPE × Distance
        const load = rpe * distanceInMiles;

        // Sum loads for the same day (multiple workouts)
        dailyLoads.set(date, (dailyLoads.get(date) || 0) + load);
      }

      // Create array of last 35 days with loads (0 for rest days)
      const today = startOfDay(new Date());
      const dailyLoadArray: DailyLoad[] = [];

      for (let i = 34; i >= 0; i--) {
        const date = format(subDays(today, i), 'yyyy-MM-dd');
        dailyLoadArray.push({
          date,
          load: dailyLoads.get(date) || 0,
        });
      }

      // Count days with actual data
      const daysWithData = dailyLoadArray.filter(d => d.load > 0).length;

      // Need at least 14 days of data for meaningful ACWR
      if (daysWithData < 7) {
        return {
          acwr: null,
          acuteLoad: 0,
          chronicLoad: 0,
          zone: 'insufficient',
          trend: dailyLoadArray.slice(-14), // Last 14 days for trend
          acwrHistory: [],
          daysWithData,
        };
      }

      // Calculate EWMA-based ACWR for each day (for history chart)
      const acwrHistory: { date: string; acwr: number }[] = [];
      const loads = dailyLoadArray.map(d => d.load);

      // We need at least 28 days to calculate proper chronic load
      for (let i = 27; i < loads.length; i++) {
        const acuteLoads = loads.slice(Math.max(0, i - 6), i + 1); // Last 7 days
        const chronicLoads = loads.slice(Math.max(0, i - 27), i + 1); // Last 28 days

        const acuteEWMA = calculateEWMA(acuteLoads, ACUTE_LAMBDA);
        const chronicEWMA = calculateEWMA(chronicLoads, CHRONIC_LAMBDA);

        if (chronicEWMA > 0) {
          acwrHistory.push({
            date: dailyLoadArray[i].date,
            acwr: Math.round((acuteEWMA / chronicEWMA) * 100) / 100,
          });
        }
      }

      // Current ACWR (most recent)
      const currentAcute = calculateEWMA(loads.slice(-7), ACUTE_LAMBDA);
      const currentChronic = calculateEWMA(loads, CHRONIC_LAMBDA);

      const acwr = currentChronic > 0
        ? Math.round((currentAcute / currentChronic) * 100) / 100
        : null;

      return {
        acwr,
        acuteLoad: Math.round(currentAcute * 10) / 10,
        chronicLoad: Math.round(currentChronic * 10) / 10,
        zone: getACWRZone(acwr),
        trend: dailyLoadArray.slice(-14), // Last 14 days
        acwrHistory,
        daysWithData,
      };
    },
    enabled: !!teamAthleteId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
