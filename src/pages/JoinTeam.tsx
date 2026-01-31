import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check, UserPlus, Link2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useUnlinkedTeamAthletes, useLinkTeamAthlete } from '@/hooks/useTeamAthletes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const joinTeamSchema = z.object({
  joinCode: z.string().length(6, 'Join code must be 6 characters'),
});

type JoinTeamFormData = z.infer<typeof joinTeamSchema>;

type JoinedTeamInfo = {
  id: string;
  name: string;
};

export default function JoinTeam() {
  const [isLoading, setIsLoading] = useState(false);
  const [joinedTeam, setJoinedTeam] = useState<JoinedTeamInfo | null>(null);
  const [showLinkOption, setShowLinkOption] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: unlinkedAthletes = [], isLoading: loadingAthletes } = useUnlinkedTeamAthletes(
    joinedTeam?.id
  );
  const linkAthlete = useLinkTeamAthlete();

  const form = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      joinCode: '',
    },
  });

  const onSubmit = async (data: JoinTeamFormData) => {
    if (!user || !profile) return;

    setIsLoading(true);

    try {
      // Find team by join code
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('join_code', data.joinCode.toUpperCase())
        .maybeSingle();

      if (teamError) throw teamError;
      if (!team) {
        toast({
          title: 'Invalid code',
          description: 'No team found with that join code.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('team_memberships')
        .select('id')
        .eq('team_id', team.id)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        toast({
          title: 'Already a member',
          description: 'You are already a member of this team.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Join team (athletes get 'athlete' role in team_memberships)
      const { error: joinError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: team.id,
          profile_id: user.id,
          role: profile.role === 'coach' ? 'coach' : 'athlete',
        });

      if (joinError) throw joinError;

      setJoinedTeam(team);
      await refreshProfile();

      // If athlete, show link option
      if (profile.role === 'athlete') {
        setShowLinkOption(true);
      }

      toast({
        title: 'Joined team!',
        description: `Welcome to ${team.name}!`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to join team',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAthlete = async () => {
    if (!selectedAthleteId || !joinedTeam || !user) return;

    try {
      await linkAthlete.mutateAsync({
        id: selectedAthleteId,
        team_id: joinedTeam.id,
        profile_id: user.id,
      });

      const athlete = unlinkedAthletes.find(a => a.id === selectedAthleteId);
      toast({
        title: 'Account linked!',
        description: `Your account has been linked to ${athlete?.first_name} ${athlete?.last_name}'s records.`,
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Failed to link account',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (joinedTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-heading">You're In!</CardTitle>
            <CardDescription>
              You've successfully joined {joinedTeam.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link option for athletes */}
            {showLinkOption && unlinkedAthletes.length > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" />
                  Link to existing records?
                </div>
                <p className="text-xs text-muted-foreground">
                  If your coach already added you to the team, you can link your account to access your workout history.
                </p>
                {loadingAthletes ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your name" />
                      </SelectTrigger>
                      <SelectContent>
                        {unlinkedAthletes.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.first_name} {athlete.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAthleteId && (
                      <Button 
                        variant="secondary" 
                        className="w-full" 
                        onClick={handleLinkAthlete}
                        disabled={linkAthlete.isPending}
                      >
                        {linkAthlete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Link My Account
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            <Button className="w-full" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading">Join a Team</CardTitle>
          <CardDescription>
            Enter the 6-character code from your coach to join the team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="joinCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Join Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ABC123" 
                        className="text-center text-2xl font-mono tracking-wider uppercase"
                        maxLength={6}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Team
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
