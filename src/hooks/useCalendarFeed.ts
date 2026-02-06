import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCalendarFeedToken(teamId?: string) {
  return useQuery({
    queryKey: ['calendar-feed-token', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('calendar_feed_token')
        .eq('id', teamId!)
        .single();

      if (error) {
        // Column may not exist yet — gracefully return null
        console.warn('Could not fetch calendar_feed_token:', error.message);
        return null;
      }

      // The column may not exist in the generated types yet
      return (data as Record<string, unknown>)?.calendar_feed_token as string | null;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function getCalendarFeedUrl(token: string, include: 'races' | 'workouts' | 'all') {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/calendar-feed?token=${token}&include=${include}`;
}

export function getWebcalUrl(token: string, include: 'races' | 'workouts' | 'all') {
  const httpUrl = getCalendarFeedUrl(token, include);
  return httpUrl.replace(/^https?:\/\//, 'webcal://');
}

export function getGoogleCalendarSubscribeUrl(token: string, include: 'races' | 'workouts' | 'all') {
  const webcalUrl = getWebcalUrl(token, include);
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
}
