import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useCreateRace } from '@/hooks/useRaces';
import { useDistances } from '@/hooks/useDistances';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WorkoutType } from '@/lib/types';
import { Constants } from '@/integrations/supabase/types';

const workoutTypes = Constants.public.Enums.workout_type;

interface AddCalendarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function AddCalendarItemDialog({ open, onOpenChange, initialDate }: AddCalendarItemDialogProps) {
  const [tab, setTab] = useState<'workout' | 'race'>('workout');

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Calendar</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'workout' | 'race')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workout">Workout</TabsTrigger>
            <TabsTrigger value="race">Race</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            {tab === 'workout' && (
              <AddWorkoutForm 
                initialDate={initialDate} 
                onSuccess={handleClose}
                onCancel={handleClose}
              />
            )}
            {tab === 'race' && (
              <AddRaceForm 
                initialDate={initialDate} 
                onSuccess={handleClose}
                onCancel={handleClose}
              />
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Workout form schema
const workoutSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(workoutTypes as unknown as [string, ...string[]]),
  description: z.string().optional(),
  athlete_notes: z.string().optional(),
  scheduled_date: z.date(),
});

function AddWorkoutForm({ 
  initialDate, 
  onSuccess, 
  onCancel 
}: { 
  initialDate?: Date; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const { currentTeam, user } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const createWorkout = useCreateScheduledWorkout();

  const form = useForm<z.infer<typeof workoutSchema>>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      title: '',
      type: 'easy',
      description: '',
      athlete_notes: '',
      scheduled_date: initialDate || new Date(),
    },
  });

  const onSubmit = async (values: z.infer<typeof workoutSchema>) => {
    if (!currentTeam || !user) return;

    try {
      await createWorkout.mutateAsync({
        team_id: currentTeam.id,
        created_by: user.id,
        title: values.title,
        type: values.type as WorkoutType,
        description: values.description || null,
        athlete_notes: values.athlete_notes || null,
        scheduled_date: format(values.scheduled_date, 'yyyy-MM-dd'),
        season_id: activeSeason?.id || null,
      });
      
      toast.success('Workout added to calendar');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add workout');
    }
  };

  return (
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
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createWorkout.isPending}>
            Add Workout
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Race form schema
const raceSchema = z.object({
  name: z.string().min(1, 'Race name is required'),
  race_date: z.date(),
  distance_id: z.string().min(1, 'Distance is required'),
  location: z.string().optional(),
  details: z.string().optional(),
  transportation_info: z.string().optional(),
  map_link: z.string().url().optional().or(z.literal('')),
  results_link: z.string().url().optional().or(z.literal('')),
});

function AddRaceForm({ 
  initialDate, 
  onSuccess, 
  onCancel 
}: { 
  initialDate?: Date; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const { currentTeam, user } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const { data: distances = [] } = useDistances();
  const createRace = useCreateRace();

  const form = useForm<z.infer<typeof raceSchema>>({
    resolver: zodResolver(raceSchema),
    defaultValues: {
      name: '',
      race_date: initialDate || new Date(),
      distance_id: '',
      location: '',
      details: '',
      transportation_info: '',
      map_link: '',
      results_link: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof raceSchema>) => {
    if (!currentTeam || !user) return;

    try {
      await createRace.mutateAsync({
        team_id: currentTeam.id,
        season_id: activeSeason?.id || null,
        name: values.name,
        race_date: format(values.race_date, 'yyyy-MM-dd'),
        distance_id: values.distance_id,
        location: values.location || undefined,
        details: values.details || undefined,
        transportation_info: values.transportation_info || undefined,
        map_link: values.map_link || undefined,
        results_link: values.results_link || undefined,
        created_by: user.id,
      });
      
      toast.success('Race added to calendar');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add race');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="race_date"
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
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Race Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., City Invitational" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="distance_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select distance" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {distances.map((distance) => (
                      <SelectItem key={distance.id} value={distance.id}>
                        {distance.name}
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Central Park" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Race details, what to bring..."
                  className="min-h-[60px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transportation_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transportation Info</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g., Bus leaves at 7am from gym"
                  className="min-h-[60px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="map_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Map Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="results_link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Results Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createRace.isPending}>
            Add Race
          </Button>
        </div>
      </form>
    </Form>
  );
}
