import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  team_id: string;
  performed_at: string;
  performer?: {
    first_name: string;
    last_name: string;
  } | null;
}

export function useAuditLogs(limit = 100) {
  const { currentTeam } = useAuth();

  return useQuery({
    queryKey: ['audit-logs', currentTeam?.id, limit],
    queryFn: async () => {
      if (!currentTeam?.id) return [];

      // First get audit logs
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get unique performer IDs
      const performerIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))] as string[];
      
      // Fetch performer names
      let performers: Record<string, { first_name: string; last_name: string }> = {};
      if (performerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', performerIds);
        
        if (profiles) {
          performers = Object.fromEntries(profiles.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }]));
        }
      }

      // Combine logs with performer info
      return logs.map(log => ({
        ...log,
        action: log.action as 'INSERT' | 'UPDATE' | 'DELETE',
        old_values: log.old_values as Record<string, unknown> | null,
        new_values: log.new_values as Record<string, unknown> | null,
        performer: log.performed_by ? performers[log.performed_by] || null : null,
      })) as AuditLogEntry[];
    },
    enabled: !!currentTeam?.id,
  });
}
