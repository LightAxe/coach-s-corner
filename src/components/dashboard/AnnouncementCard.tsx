import { useState } from 'react';
import { AlertCircle, Bell, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Announcement } from '@/lib/types';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';
import { EditAnnouncementDialog } from '@/components/announcements/EditAnnouncementDialog';
import { DeleteAnnouncementDialog } from '@/components/announcements/DeleteAnnouncementDialog';

interface AnnouncementCardProps {
  announcements: Announcement[];
  isLoading?: boolean;
  isCoach?: boolean;
}

export function AnnouncementCard({ announcements, isLoading, isCoach }: AnnouncementCardProps) {
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

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

  // Show card with empty state for coaches, hide completely for non-coaches if empty
  if (announcements.length === 0 && !isCoach) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Announcements
            </CardTitle>
            {isCoach && <CreateAnnouncementDialog />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No announcements yet</p>
              {isCoach && (
                <p className="text-xs mt-1">Click "New" to create your first announcement</p>
              )}
            </div>
          ) : (
            announcements.map((announcement) => (
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
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(announcement.created_at), 'MMM d')}
                        </span>
                        {isCoach && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingAnnouncement(announcement)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeletingAnnouncement(announcement)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {announcement.content && (
                      <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <EditAnnouncementDialog
        announcement={editingAnnouncement}
        open={!!editingAnnouncement}
        onOpenChange={(open) => !open && setEditingAnnouncement(null)}
      />

      <DeleteAnnouncementDialog
        announcement={deletingAnnouncement}
        open={!!deletingAnnouncement}
        onOpenChange={(open) => !open && setDeletingAnnouncement(null)}
      />
    </>
  );
}
