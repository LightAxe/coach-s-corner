import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { useCreateTeamAthlete } from '@/hooks/useTeamAthletes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const addAthleteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type AddAthleteFormData = z.infer<typeof addAthleteSchema>;

interface AddAthleteDialogProps {
  teamId: string;
  seasonId?: string;
}

export function AddAthleteDialog({ teamId, seasonId }: AddAthleteDialogProps) {
  const [open, setOpen] = useState(false);
  const { user, currentTeam } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const { toast } = useToast();
  const createAthlete = useCreateTeamAthlete();

  const form = useForm<AddAthleteFormData>({
    resolver: zodResolver(addAthleteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = async (data: AddAthleteFormData) => {
    if (!user) return;

    try {
      const targetSeasonId = seasonId || activeSeason?.id;
      
      await createAthlete.mutateAsync({
        team_id: teamId,
        first_name: data.firstName,
        last_name: data.lastName,
        created_by: user.id,
        season_id: targetSeasonId,
      });

      toast({
        title: 'Athlete added',
        description: `${data.firstName} ${data.lastName} has been added to the team.`,
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Failed to add athlete',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Athlete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Athlete</DialogTitle>
          <DialogDescription>
            Add an athlete to your team. They can be linked to an account later if they join the app.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAthlete.isPending}>
                {createAthlete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Athlete
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
