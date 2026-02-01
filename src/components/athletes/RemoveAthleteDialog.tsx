import { UserMinus, AlertTriangle } from 'lucide-react';
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
import { useDeleteTeamAthlete } from '@/hooks/useTeamAthletes';
import { toast } from 'sonner';
import type { TeamAthleteWithProfile } from '@/lib/types';

interface RemoveAthleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: TeamAthleteWithProfile | null;
  teamId: string;
  onRemoved?: () => void;
}

export function RemoveAthleteDialog({ 
  open, 
  onOpenChange, 
  athlete, 
  teamId,
  onRemoved 
}: RemoveAthleteDialogProps) {
  const deleteAthlete = useDeleteTeamAthlete();

  if (!athlete) return null;

  const handleRemove = async () => {
    try {
      await deleteAthlete.mutateAsync({ id: athlete.id, team_id: teamId });
      toast.success('Athlete removed from team');
      onOpenChange(false);
      onRemoved?.();
    } catch (error) {
      toast.error('Failed to remove athlete');
    }
  };

  const athleteName = `${athlete.first_name} ${athlete.last_name}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Remove Athlete
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to remove <strong>{athleteName}</strong> from the team?
            </p>
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">What happens to their data:</p>
                <ul className="list-disc list-inside mt-1 text-muted-foreground">
                  <li>Workout logs will be kept but no longer linked</li>
                  <li>Race results will be kept but no longer linked</li>
                  <li>The athlete will lose access if they have an account</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove Athlete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
