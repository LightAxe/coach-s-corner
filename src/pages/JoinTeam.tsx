import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const joinTeamSchema = z.object({
  joinCode: z.string().length(6, 'Join code must be 6 characters'),
});

type JoinTeamFormData = z.infer<typeof joinTeamSchema>;

type JoinedTeamInfo = {
  id: string;
  name: string;
  role: 'coach' | 'athlete';
};

export default function JoinTeam() {
  const [isLoading, setIsLoading] = useState(false);
  const [joinedTeam, setJoinedTeam] = useState<JoinedTeamInfo | null>(null);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      joinCode: '',
    },
  });

  const onSubmit = async (data: JoinTeamFormData) => {
    if (!user || !profile) return;

    setIsLoading(true);
    const codeUpper = data.joinCode.toUpperCase();

    try {
      // Look up team by code using secure RPC (avoids direct teams table access)
      const { data: lookupResults, error: lookupError } = await supabase
        .rpc('lookup_team_by_code', { _code: codeUpper });

      if (lookupError) throw lookupError;

      const lookup = lookupResults?.[0];
      let team: { id: string; name: string } | null = lookup ? { id: lookup.id, name: lookup.name } : null;
      let assignedRole: 'coach' | 'athlete' = (lookup?.code_type === 'coach') ? 'coach' : 'athlete';

      if (lookup?.code_type === 'coach') {
        // Verify user is actually a coach in their profile
        if (profile.role !== 'coach') {
          toast({
            title: 'Invalid code',
            description: 'This code is for coaches only. Please use the athlete join code.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

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

      // Join team with role determined by CODE TYPE, not profile role
      const { error: joinError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: team.id,
          profile_id: user.id,
          role: assignedRole,
        });

      if (joinError) throw joinError;

      setJoinedTeam({ ...team, role: assignedRole });
      await refreshProfile();

      toast({
        title: 'Joined team!',
        description: `Welcome to ${team.name}!${assignedRole === 'coach' ? ' You have been added as a coach.' : ''}`,
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
              {joinedTeam.role === 'athlete' && (
                <> Your coach will link your account to the team roster.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
