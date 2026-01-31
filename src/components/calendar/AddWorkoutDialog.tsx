import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreateScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WorkoutType } from '@/lib/types';
import { Constants } from '@/integrations/supabase/types';

const workoutTypes = Constants.public.Enums.workout_type;

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(workoutTypes as unknown as [string, ...string[]]),
  distance: z.string().optional(),
  description: z.string().optional(),
  athlete_notes: z.string().optional(),
  scheduled_date: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function AddWorkoutDialog({ open, onOpenChange, initialDate }: AddWorkoutDialogProps) {
  const { currentTeam, user } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const createWorkout = useCreateScheduledWorkout();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      type: 'easy',
      distance: '',
      description: '',
      athlete_notes: '',
      scheduled_date: initialDate || new Date(),
    },
  });

  // Reset form when dialog opens with new date
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialDate) {
      form.setValue('scheduled_date', initialDate);
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentTeam || !user) return;

    try {
      await createWorkout.mutateAsync({
        team_id: currentTeam.id,
        created_by: user.id,
        title: values.title,
        type: values.type as WorkoutType,
        distance: values.distance || null,
        description: values.description || null,
        athlete_notes: values.athlete_notes || null,
        scheduled_date: format(values.scheduled_date, 'yyyy-MM-dd'),
        season_id: activeSeason?.id || null,
      });
      
      toast.success('Workout added to calendar');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add workout');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Workout</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scheduled_date"
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
                            format(field.value, 'PPP')
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Morning Long Run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workoutTypes.map((type) => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 6 miles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Workout details..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="athlete_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete Scaling Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Varsity: 8mi, JV: 6mi, Freshmen: 4mi"
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkout.isPending}>
                Add Workout
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
