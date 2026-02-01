import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import type { Announcement } from '@/lib/types';

interface DeleteAnnouncementDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAnnouncementDialog({ announcement, open, onOpenChange }: DeleteAnnouncementDialogProps) {
  const { currentTeam } = useAuth();
  const deleteAnnouncement = useDeleteAnnouncement();

  const handleDelete = async () => {
    if (!announcement || !currentTeam?.id) return;

    try {
      await deleteAnnouncement.mutateAsync({
        id: announcement.id,
        team_id: currentTeam.id,
      });

      toast({
        title: 'Announcement deleted',
        description: 'The announcement has been removed.',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{announcement?.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteAnnouncement.isPending}
          >
            {deleteAnnouncement.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
