import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useWorkoutLogForProfile,
  useWorkoutLogForTeamAthlete,
  useCreateWorkoutLog, 
  useUpdateWorkoutLog 
} from '@/hooks/useWorkoutLogs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass, type ScheduledWorkout, type CompletionStatus } from '@/lib/types';
import { FeelingSelector } from './FeelingSelector';
import { RPESlider } from './RPESlider';

const formSchema = z.object({
  completion_status: z.enum(['none', 'partial', 'complete']),
  effort_level: z.number().min(1).max(10).nullable(),
  how_felt: z.string().optional(),
  distance_value: z.number().positive().nullable(),
  distance_unit: z.enum(['miles', 'km']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkoutLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: ScheduledWorkout | null;
  /** For coach logging on behalf of a team athlete */
  teamAthleteId?: string;
  /** Display name when logging for an athlete */
  athleteName?: string;
}

export function WorkoutLogDialog({
  open,
  onOpenChange,
  workout,
  teamAthleteId,
  athleteName
}: WorkoutLogDialogProps) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const { user } = useAuth();
  
  // Use team athlete log or profile log based on context
  const isTeamAthleteLog = !!teamAthleteId;
  
  const { data: profileLog, isLoading: profileLogLoading } = useWorkoutLogForProfile(
    !isTeamAthleteLog ? workout?.id : undefined,
    !isTeamAthleteLog ? user?.id : undefined
  );
  
  const { data: teamAthleteLog, isLoading: teamAthleteLogLoading } = useWorkoutLogForTeamAthlete(
    isTeamAthleteLog ? workout?.id : undefined,
    isTeamAthleteLog ? teamAthleteId : undefined
  );
  
  const existingLog = isTeamAthleteLog ? teamAthleteLog : profileLog;
  const isLoading = isTeamAthleteLog ? teamAthleteLogLoading : profileLogLoading;
  
  const createLog = useCreateWorkoutLog();
  const updateLog = useUpdateWorkoutLog();
  
  const isEditing = !!existingLog;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      completion_status: 'complete',
      effort_level: null,
      how_felt: '',
      distance_value: null,
      distance_unit: 'miles',
      notes: '',
    },
  });

  // Reset form when dialog opens or existing log changes
  useEffect(() => {
    if (open && !isLoading) {
      if (existingLog) {
        form.reset({
          completion_status: existingLog.completion_status || 'complete',
          effort_level: existingLog.effort_level,
          how_felt: existingLog.how_felt || '',
          distance_value: existingLog.distance_value ? Number(existingLog.distance_value) : null,
          distance_unit: (existingLog.distance_unit as 'miles' | 'km') || 'miles',
          notes: existingLog.notes || '',
        });
      } else {
        form.reset({
          completion_status: 'complete',
          effort_level: null,
          how_felt: '',
          distance_value: null,
          distance_unit: 'miles',
          notes: '',
        });
      }
    }
  }, [open, existingLog, isLoading, form]);

  const onSubmit = async (values: FormValues) => {
    if (!workout || !user) return;

    try {
      if (isEditing && existingLog) {
        await updateLog.mutateAsync({
          id: existingLog.id,
          completed: values.completion_status !== 'none',
          completion_status: values.completion_status as CompletionStatus,
          effort_level: values.effort_level,
          how_felt: values.how_felt || null,
          distance_value: values.distance_value,
          distance_unit: values.distance_unit,
          notes: values.notes || null,
        });
        toast.success('Workout log updated');
      } else {
        await createLog.mutateAsync({
          scheduled_workout_id: workout.id,
          profile_id: isTeamAthleteLog ? null : user.id,
          team_athlete_id: isTeamAthleteLog ? teamAthleteId : null,
          logged_by: user.id,
          completed: values.completion_status !== 'none',
          completion_status: values.completion_status as CompletionStatus,
          effort_level: values.effort_level,
          how_felt: values.how_felt || null,
          distance_value: values.distance_value,
          distance_unit: values.distance_unit,
          notes: values.notes || null,
        });
        toast.success(isTeamAthleteLog ? `Workout logged for ${athleteName}` : 'Workout logged!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save workout log');
    }
  };

  if (!workout) return null;

  const workoutDate = parseISO(workout.scheduled_date);
  const typeLabel = workout.type.charAt(0).toUpperCase() + workout.type.slice(1);

  // Handle close with unsaved changes check
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      setDiscardConfirmOpen(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleDiscardConfirm = () => {
    setDiscardConfirmOpen(false);
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Workout Log' : 'Log Workout'}
            {athleteName && <span className="text-muted-foreground font-normal"> for {athleteName}</span>}
          </DialogTitle>
        </DialogHeader>

        {/* Workout Info Header */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{workout.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(workoutDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={cn('capitalize', getWorkoutTypeBadgeClass(workout.type))}
            >
              {typeLabel}
            </Badge>
          </div>
          {workout.description && (
            <p className="text-sm text-muted-foreground">{workout.description}</p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Completion Status */}
              <FormField
                control={form.control}
                name="completion_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Did you complete this workout?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="complete" id="complete" />
                          <Label htmlFor="complete" className="cursor-pointer">
                            Yes, completed it fully
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="partial" id="partial" />
                          <Label htmlFor="partial" className="cursor-pointer">
                            Partially completed
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id="none" />
                          <Label htmlFor="none" className="cursor-pointer">
                            Did not complete
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Distance */}
              <FormField
                control={form.control}
                name="distance_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance Run</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? parseFloat(val) : null);
                          }}
                          className="flex-1"
                        />
                      </FormControl>
                      <FormField
                        control={form.control}
                        name="distance_unit"
                        render={({ field: unitField }) => (
                          <div className="flex rounded-md border overflow-hidden">
                            <button
                              type="button"
                              onClick={() => unitField.onChange('miles')}
                              className={cn(
                                'px-3 py-2 text-sm font-medium transition-colors',
                                unitField.value === 'miles'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              )}
                            >
                              mi
                            </button>
                            <button
                              type="button"
                              onClick={() => unitField.onChange('km')}
                              className={cn(
                                'px-3 py-2 text-sm font-medium transition-colors',
                                unitField.value === 'km'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              )}
                            >
                              km
                            </button>
                          </div>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RPE */}
              <FormField
                control={form.control}
                name="effort_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate of Perceived Exertion (RPE)</FormLabel>
                    <FormControl>
                      <RPESlider
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* How Felt */}
              <FormField
                control={form.control}
                name="how_felt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did you feel?</FormLabel>
                    <FormControl>
                      <FeelingSelector
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this workout..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLog.isPending || updateLog.isPending}
                >
                  {isEditing ? 'Update Log' : 'Save Log'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleDiscardConfirm}>
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
