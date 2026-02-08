import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUSPhone } from '@/lib/phone';

interface UpdateProfileParams {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      if (!user) throw new Error('Not authenticated');

      const normalizedPhone = params.phone?.trim()
        ? normalizeUSPhone(params.phone) ?? params.phone.trim()
        : null;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: params.first_name,
          last_name: params.last_name,
          email: params.email || null,
          phone: normalizedPhone,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Refresh the profile in AuthContext
      await refreshProfile();
      // Invalidate any profile-related queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
