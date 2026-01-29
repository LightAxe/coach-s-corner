import { AlertCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Announcement } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface AnnouncementCardProps {
  announcements: Announcement[];
}

export function AnnouncementCard({ announcements }: AnnouncementCardProps) {
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
                    {format(parseISO(announcement.date), 'MMM d')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{announcement.content}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
