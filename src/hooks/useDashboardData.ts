import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import type { ScheduledWorkout, Announcement, TeamMemberWithProfile, RaceWithDistance } from '@/lib/types';

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
export function useTeamStats(teamId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['team-stats', teamId, today],
    queryFn: async () => {
      if (!teamId) return { totalAthletes: 0, workoutsCompleted: 0, weeklyMiles: 0 };
      
      // Get athlete count from team_athletes (includes shell + linked athletes)
      const { count: athleteCount, error: athleteError } = await supabase
        .from('team_athletes')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);
      
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
      
      // Weekly miles would require additional distance tracking
      // For now, return 0 as placeholder
      return {
        totalAthletes: athleteCount || 0,
        workoutsCompleted: completedCount,
        weeklyMiles: 0, // Placeholder - would need distance logging
      };
    },
    enabled: !!teamId,
  });
}

// Fetch team members (athletes) with profiles
export function useTeamAthletes(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-athletes', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('team_memberships')
        .select('*, profiles(*)')
        .eq('team_id', teamId)
        .eq('role', 'athlete');
      
      if (error) throw error;
      return data as TeamMemberWithProfile[];
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

// Note: useWorkoutTemplates removed - templates feature deprecated
