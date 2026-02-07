import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import type { ScheduledWorkout, Announcement, TeamMemberWithProfile, RaceWithDistance, formatTime } from '@/lib/types';

export interface AthleteActivity {
  id: string;
  type: 'workout' | 'race';
  athleteName: string;
  title: string;
  date: string;
  details?: string;
}

// Fetch scheduled workouts for the current week
export function useScheduledWorkouts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-workouts', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('team_id', teamId)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date');
      
      if (error) throw error;
      return data as ScheduledWorkout[];
    },
    enabled: !!teamId,
  });
}

// Fetch workouts for a specific date range (for calendar)
export function useScheduledWorkoutsRange(teamId: string | undefined, startDate: Date, endDate: Date) {
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['scheduled-workouts', teamId, start, end],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('team_id', teamId)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date');
      
      if (error) throw error;
      return data as ScheduledWorkout[];
    },
    enabled: !!teamId,
  });
}

// Get today's workout
export function useTodayWorkout(teamId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['today-workout', teamId, today],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('team_id', teamId)
        .eq('scheduled_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as ScheduledWorkout | null;
    },
    enabled: !!teamId,
  });
}

// Get today's race
export function useTodayRace(teamId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['today-race', teamId, today],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from('races')
        .select('*, distances(*)')
        .eq('team_id', teamId)
        .eq('race_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as RaceWithDistance | null;
    },
    enabled: !!teamId,
  });
}

// Fetch races for current week
export function useWeekRaces(teamId: string | undefined) {
  return useQuery({
    queryKey: ['week-races', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('races')
        .select('*, distances(*)')
        .eq('team_id', teamId)
        .gte('race_date', weekStart)
        .lte('race_date', weekEnd)
        .order('race_date');
      
      if (error) throw error;
      return data as RaceWithDistance[];
    },
    enabled: !!teamId,
  });
}

// Fetch recent announcements
export function useAnnouncements(teamId: string | undefined) {
  return useQuery({
    queryKey: ['announcements', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!teamId,
  });
}

// Fetch team stats (athlete count, today's completions, weekly miles)
export function useTeamStats(teamId: string | undefined, seasonId?: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['team-stats', teamId, seasonId, today],
    queryFn: async () => {
      if (!teamId) return { totalAthletes: 0, workoutsCompleted: 0, weeklyMiles: 0 };
      
      // Get athlete count from team_athletes, filtered by season if provided
      let athleteQuery = supabase
        .from('team_athletes')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);
      
      if (seasonId) {
        athleteQuery = athleteQuery.eq('season_id', seasonId);
      }
      
      const { count: athleteCount, error: athleteError } = await athleteQuery;
      
      if (athleteError) throw athleteError;
      
      // Get today's completed workouts count
      // First get today's scheduled workout for this team
      const { data: todayWorkout } = await supabase
        .from('scheduled_workouts')
        .select('id')
        .eq('team_id', teamId)
        .eq('scheduled_date', today)
        .maybeSingle();
      
      let completedCount = 0;
      if (todayWorkout) {
        const { count, error: logsError } = await supabase
          .from('workout_logs')
          .select('*', { count: 'exact', head: true })
          .eq('scheduled_workout_id', todayWorkout.id)
          .eq('completed', true);
        
        if (logsError) throw logsError;
        completedCount = count || 0;
      }
      
      // Get weekly miles from workout logs for team athletes
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Scheduled workout logs (date comes from the scheduled workout)
      const { data: scheduledLogs } = await supabase
        .from('workout_logs')
        .select(`
          distance_value,
          distance_unit,
          scheduled_workouts!inner (
            scheduled_date,
            team_id
          )
        `)
        .eq('scheduled_workouts.team_id', teamId)
        .gte('scheduled_workouts.scheduled_date', weekStart)
        .lte('scheduled_workouts.scheduled_date', weekEnd)
        .not('distance_value', 'is', null);

      // Personal workout logs (date comes from workout_date)
      const { data: personalLogs } = await supabase
        .from('workout_logs')
        .select(`
          distance_value,
          distance_unit,
          team_athletes!inner (
            team_id
          )
        `)
        .is('scheduled_workout_id', null)
        .eq('team_athletes.team_id', teamId)
        .gte('workout_date', weekStart)
        .lte('workout_date', weekEnd)
        .not('distance_value', 'is', null);

      let totalMiles = 0;
      const allLogs = [...(scheduledLogs || []), ...(personalLogs || [])];
      for (const log of allLogs) {
        const dist = log.distance_value ?? 0;
        totalMiles += log.distance_unit === 'km' ? dist * 0.621371 : dist;
      }

      return {
        totalAthletes: athleteCount || 0,
        workoutsCompleted: completedCount,
        weeklyMiles: Math.round(totalMiles * 10) / 10,
      };
    },
    enabled: !!teamId,
  });
}

// Fetch all team members with profiles
export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_memberships')
        .select('*, profiles(*)')
        .eq('team_id', teamId);
      
      if (error) throw error;
      return data as TeamMemberWithProfile[];
    },
    enabled: !!teamId,
  });
}

// Fetch recent athlete activities (workout logs + race results)
export function useRecentAthleteActivity(teamId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['recent-athlete-activity', teamId, limit],
    queryFn: async (): Promise<AthleteActivity[]> => {
      if (!teamId) return [];
      
      // Fetch recent workout logs for team athletes
      const { data: workoutLogs, error: logsError } = await supabase
        .from('workout_logs')
        .select(`
          id,
          created_at,
          completion_status,
          team_athlete_id,
          scheduled_workouts!inner (
            title,
            team_id
          ),
          team_athletes!inner (
            first_name,
            last_name,
            team_id
          )
        `)
        .eq('team_athletes.team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (logsError) throw logsError;
      
      // Fetch recent race results for team athletes
      const { data: raceResults, error: resultsError } = await supabase
        .from('race_results')
        .select(`
          id,
          created_at,
          time_seconds,
          place,
          team_athlete_id,
          races (
            name,
            team_id
          ),
          team_athletes!inner (
            first_name,
            last_name,
            team_id
          )
        `)
        .eq('team_athletes.team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (resultsError) throw resultsError;
      
      // Combine and sort activities
      const activities: AthleteActivity[] = [];
      
      // Add workout logs
      if (workoutLogs) {
        for (const log of workoutLogs) {
          const athlete = log.team_athletes as { first_name: string; last_name: string } | null;
          const workout = log.scheduled_workouts as { title: string } | null;
          
          if (athlete && workout) {
            activities.push({
              id: log.id,
              type: 'workout',
              athleteName: `${athlete.first_name} ${athlete.last_name}`,
              title: workout.title,
              date: log.created_at,
              details: log.completion_status === 'complete' ? 'Completed' : 
                       log.completion_status === 'partial' ? 'Partial' : undefined,
            });
          }
        }
      }
      
      // Add race results
      if (raceResults) {
        for (const result of raceResults) {
          const athlete = result.team_athletes as { first_name: string; last_name: string } | null;
          const race = result.races as { name: string } | null;
          
          if (athlete && race) {
            const { formatTime } = await import('@/lib/types');
            activities.push({
              id: result.id,
              type: 'race',
              athleteName: `${athlete.first_name} ${athlete.last_name}`,
              title: race.name,
              date: result.created_at,
              details: result.place ? `#${result.place} • ${formatTime(result.time_seconds)}` : formatTime(result.time_seconds),
            });
          }
        }
      }
      
      // Sort by date descending and limit
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    enabled: !!teamId,
  });
}

// Note: useWorkoutTemplates removed - templates feature deprecated
