import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Announcement } from '@/lib/types';

interface CreateAnnouncementData {
  team_id: string;
  title: string;
  content?: string;
  priority: 'normal' | 'important';
  created_by: string;
}

interface UpdateAnnouncementData {
  id: string;
  team_id: string;
  title?: string;
  content?: string;
  priority?: 'normal' | 'important';
}

// Fetch announcements for a team
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
        .limit(10);
      
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!teamId,
  });
}

// Create a new announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateAnnouncementData) => {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          team_id: data.team_id,
          title: data.title,
          content: data.content || null,
          priority: data.priority,
          created_by: data.created_by,
        })
        .select()
        .single();
      
      if (error) throw error;
      return announcement as Announcement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.team_id] });
    },
  });
}

// Update an existing announcement
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id, ...updates }: UpdateAnnouncementData) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.team_id] });
    },
  });
}

// Delete an announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', variables.team_id] });
    },
  });
}
