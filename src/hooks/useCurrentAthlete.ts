import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Get the current user's team_athlete record
export function useCurrentAthlete(teamId?: string) {
  const { user, isAthlete } = useAuth();

  return useQuery({
    queryKey: ['current-athlete', teamId, user?.id],
    queryFn: async () => {
      if (!user || !teamId) return null;

      const { data, error } = await supabase
        .from('team_athletes')
        .select('*')
        .eq('team_id', teamId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current athlete:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user && !!teamId && isAthlete,
  });
}
