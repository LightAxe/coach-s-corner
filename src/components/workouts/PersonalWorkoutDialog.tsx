import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WorkoutType } from '@/lib/types';
import { FeelingSelector } from './FeelingSelector';
import { RPESlider } from './RPESlider';
import { useCreatePersonalWorkout, type PersonalWorkoutData } from '@/hooks/useWorkoutLogs';

const workoutTypes: { value: WorkoutType; label: string }[] = [
  { value: 'easy', label: 'Easy Run' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Interval' },
  { value: 'long', label: 'Long Run' },
  { value: 'race', label: 'Race' },
  { value: 'other', label: 'Other' },
];

const formSchema = z.object({
  workout_date: z.date({
    required_error: 'Date is required',
  }),
  workout_type: z.enum(['easy', 'tempo', 'interval', 'long', 'rest', 'race', 'other']),
  distance_value: z.number().positive('Distance must be greater than 0').nullable(),
  distance_unit: z.enum(['miles', 'km']),
  effort_level: z.number().min(1).max(10).nullable(),
  how_felt: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PersonalWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional pre-selected date */
  initialDate?: Date;
  /** For coach logging on behalf of a team athlete */
  teamAthleteId?: string;
  /** Display name when logging for an athlete */
  athleteName?: string;
}

export function PersonalWorkoutDialog({
  open,
  onOpenChange,
  initialDate,
  teamAthleteId,
  athleteName,
}: PersonalWorkoutDialogProps) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const { user } = useAuth();
  const createPersonalWorkout = useCreatePersonalWorkout();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workout_date: initialDate || new Date(),
      workout_type: 'easy',
      distance_value: null,
      distance_unit: 'miles',
      effort_level: null,
      how_felt: '',
      notes: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        workout_date: initialDate || new Date(),
        workout_type: 'easy',
        distance_value: null,
        distance_unit: 'miles',
        effort_level: null,
        how_felt: '',
        notes: '',
      });
    }
  }, [open, initialDate, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    try {
      const data: PersonalWorkoutData = {
        workout_date: format(values.workout_date, 'yyyy-MM-dd'),
        workout_type: values.workout_type,
        profile_id: teamAthleteId ? null : user.id,
        team_athlete_id: teamAthleteId || null,
        logged_by: user.id,
        completed: true,
        completion_status: 'complete',
        effort_level: values.effort_level,
        how_felt: values.how_felt || null,
        distance_value: values.distance_value,
        distance_unit: values.distance_unit,
        notes: values.notes || null,
      };

      await createPersonalWorkout.mutateAsync(data);
      toast.success(teamAthleteId ? `Personal workout logged for ${athleteName}` : 'Personal workout logged!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to log workout');
    }
  };

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

  // Limit date selection to past and today, up to 60 days back
  const minDate = subDays(new Date(), 60);
  const maxDate = new Date();

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Personal Workout
              {athleteName && <span className="text-muted-foreground font-normal"> for {athleteName}</span>}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Date Picker */}
              <FormField
                control={form.control}
                name="workout_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'EEEE, MMMM d, yyyy')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > maxDate || date < minDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Workout Type */}
              <FormField
                control={form.control}
                name="workout_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workout type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workoutTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel>Distance</FormLabel>
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
                      <RPESlider value={field.value} onChange={field.onChange} />
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
                      <FeelingSelector value={field.value || ''} onChange={field.onChange} />
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
                <Button type="submit" disabled={createPersonalWorkout.isPending}>
                  Log Workout
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
