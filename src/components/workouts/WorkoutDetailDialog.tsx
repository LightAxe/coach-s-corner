import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, Calendar, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass, type ScheduledWorkout } from '@/lib/types';
import { useDeleteScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { toast } from 'sonner';

interface WorkoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: ScheduledWorkout | null;
  teamId: string;
  onEdit: () => void;
}

export function WorkoutDetailDialog({ 
  open, 
  onOpenChange, 
  workout, 
  teamId,
  onEdit 
}: WorkoutDetailDialogProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteWorkout = useDeleteScheduledWorkout();

  if (!workout) return null;

  const handleDelete = async () => {
    try {
      await deleteWorkout.mutateAsync({ id: workout.id, team_id: teamId });
      toast.success('Workout deleted');
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete workout');
    }
  };

  const handleEdit = () => {
    onOpenChange(false);
    onEdit();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn('capitalize', getWorkoutTypeBadgeClass(workout.type))}
              >
                {workout.type}
              </Badge>
              <DialogTitle>{workout.title}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(parseISO(workout.scheduled_date), 'EEEE, MMMM d, yyyy')}
            </div>

            {/* Description */}
            {workout.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {workout.description}
                </p>
              </div>
            )}

            {/* Athlete Notes */}
            {workout.athlete_notes && (
              <div>
                <p className="text-sm font-medium mb-1">Athlete Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {workout.athlete_notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workout.title}"? Any workout logs 
              associated with this workout will also be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
