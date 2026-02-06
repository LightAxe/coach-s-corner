import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Attendance, AttendanceStatus } from '@/lib/types';

// Fetch attendance records for a team on a specific date
export function useAttendanceByDate(teamId?: string, date?: string) {
  return useQuery({
    queryKey: ['attendance', teamId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('team_id', teamId!)
        .eq('date', date!);
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!teamId && !!date,
  });
}

// Fetch attendance history for a team over a date range
export function useAttendanceRange(teamId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['attendance-range', teamId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('team_id', teamId!)
        .gte('date', startDate!)
        .lte('date', endDate!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!teamId && !!startDate && !!endDate,
  });
}

// Upsert a single attendance record
export function useUpsertAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      team_id: string;
      team_athlete_id: string;
      date: string;
      status: AttendanceStatus;
      note?: string | null;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(record, { onConflict: 'team_id,team_athlete_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', data.team_id, data.date] });
      queryClient.invalidateQueries({ queryKey: ['attendance-range', data.team_id] });
    },
  });
}

// Bulk upsert attendance for a whole roster on a date
export function useBulkUpsertAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: {
      team_id: string;
      team_athlete_id: string;
      date: string;
      status: AttendanceStatus;
      note?: string | null;
      created_by: string;
    }[]) => {
      if (records.length === 0) return [];
      const { data, error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'team_id,team_athlete_id,date' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      if (variables.length > 0) {
        const { team_id, date } = variables[0];
        queryClient.invalidateQueries({ queryKey: ['attendance', team_id, date] });
        queryClient.invalidateQueries({ queryKey: ['attendance-range', team_id] });
      }
    },
  });
}
