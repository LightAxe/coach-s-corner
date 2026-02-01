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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreateRace } from '@/hooks/useRaces';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Safe URL schema that only allows http/https schemes
const safeUrlSchema = z.string()
  .refine(
    val => !val || /^https?:\/\//i.test(val),
    { message: 'URL must start with http:// or https://' }
  )
  .optional()
  .or(z.literal(''));

const formSchema = z.object({
  name: z.string().min(1, 'Race name is required').max(100, 'Race name too long'),
  race_date: z.date(),
  location: z.string().max(200, 'Location too long').optional(),
  details: z.string().max(2000, 'Details too long').optional(),
  transportation_info: z.string().max(500, 'Transportation info too long').optional(),
  map_link: safeUrlSchema,
  results_link: safeUrlSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface AddRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function AddRaceDialog({ open, onOpenChange, initialDate }: AddRaceDialogProps) {
  const { currentTeam, user } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const createRace = useCreateRace();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      race_date: initialDate || new Date(),
      location: '',
      details: '',
      transportation_info: '',
      map_link: '',
      results_link: '',
    },
  });

  // Reset form when dialog opens with new date
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && initialDate) {
      form.setValue('race_date', initialDate);
    }
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!currentTeam || !user) return;

    try {
      await createRace.mutateAsync({
        team_id: currentTeam.id,
        season_id: activeSeason?.id || null,
        name: values.name,
        race_date: format(values.race_date, 'yyyy-MM-dd'),
        location: values.location || undefined,
        details: values.details || undefined,
        transportation_info: values.transportation_info || undefined,
        map_link: values.map_link || undefined,
        results_link: values.results_link || undefined,
        created_by: user.id,
      });
      
      toast.success('Race added to calendar');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add race');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Race</DialogTitle>
        </DialogHeader>

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

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Race details, what to bring, logistics..."
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
              name="transportation_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transportation Info</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Bus leaves at 6:30 AM from the gym"
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
                    <FormLabel>Course Map URL</FormLabel>
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
                    <FormLabel>Results URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRace.isPending}>
                Add Race
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
