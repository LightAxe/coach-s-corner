import { AlertCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Announcement } from '@/lib/types';

interface AnnouncementCardProps {
  announcements: Announcement[];
  isLoading?: boolean;
}

export function AnnouncementCard({ announcements, isLoading }: AnnouncementCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg p-4 bg-muted">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={cn(
              'rounded-lg p-4 border',
              announcement.priority === 'important'
                ? 'bg-accent/10 border-accent/30'
                : 'bg-muted border-transparent'
            )}
          >
            <div className="flex items-start gap-3">
              {announcement.priority === 'important' && (
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{announcement.title}</h4>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(parseISO(announcement.created_at), 'MMM d')}
                  </span>
                </div>
                {announcement.content && (
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
