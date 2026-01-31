import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Distance } from '@/lib/types';

// Fetch all global distances (for dropdowns)
export function useDistances() {
  return useQuery({
    queryKey: ['distances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distances')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as Distance[];
    },
  });
}
