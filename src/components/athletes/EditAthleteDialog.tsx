import { useEffect } from 'react';
import { Pencil, User } from 'lucide-react';
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
import { useUpdateTeamAthlete } from '@/hooks/useTeamAthletes';
import { toast } from 'sonner';
import type { TeamAthleteWithProfile } from '@/lib/types';

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAthleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: TeamAthleteWithProfile | null;
  teamId: string;
}

export function EditAthleteDialog({ open, onOpenChange, athlete, teamId }: EditAthleteDialogProps) {
  const updateAthlete = useUpdateTeamAthlete();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
    },
  });

  // Reset form when athlete changes
  useEffect(() => {
    if (athlete && open) {
      form.reset({
        first_name: athlete.first_name,
        last_name: athlete.last_name,
      });
    }
  }, [athlete, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!athlete) return;

    try {
      await updateAthlete.mutateAsync({
        id: athlete.id,
        team_id: teamId,
        first_name: values.first_name,
        last_name: values.last_name,
      });
      
      toast.success('Athlete updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update athlete');
    }
  };

  if (!athlete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Athlete
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="First name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAthlete.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
