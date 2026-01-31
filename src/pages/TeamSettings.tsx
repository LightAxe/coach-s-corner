import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, RefreshCw, Users, ShieldCheck, Loader2, Check, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useTeamWithCodes, 
  useRegenerateTeamCode,
  useGenerateCoachInviteCode 
} from '@/hooks/useTeamSettings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TeamSettings() {
  const { currentTeam, isCoach } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: team, isLoading } = useTeamWithCodes(currentTeam?.id);
  const regenerateCode = useRegenerateTeamCode();
  const generateCoachCode = useGenerateCoachInviteCode();

  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const copyToClipboard = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard.`,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the code manually.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateCode = async (codeType: 'athlete' | 'coach') => {
    if (!currentTeam) return;
    try {
      const newCode = await regenerateCode.mutateAsync({ 
        teamId: currentTeam.id, 
        codeType 
      });
      toast({
        title: 'Code regenerated',
        description: `New ${codeType} code: ${newCode}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to regenerate code',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateCoachCode = async () => {
    if (!currentTeam) return;
    try {
      const code = await generateCoachCode.mutateAsync(currentTeam.id);
      toast({
        title: 'Coach invite code created',
        description: `Code: ${code}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to create code',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-heading font-bold">Team Settings</h1>
          <p className="text-muted-foreground">
            Manage your team's join codes and settings.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : team ? (
          <div className="space-y-6">
            {/* Athlete Join Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Athlete Join Code
                </CardTitle>
                <CardDescription>
                  Share this code with athletes and parents so they can join your team.
                  Athletes joining with this code will be added as team members.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="athlete-code">Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="athlete-code"
                      value={team.join_code}
                      readOnly
                      className="font-mono text-lg tracking-wider uppercase"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(team.join_code, 'Athlete join code')}
                    >
                      {copiedCode === team.join_code ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Code
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate athlete code?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will invalidate the current code. Anyone with the old code 
                        won't be able to join. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleRegenerateCode('athlete')}
                        disabled={regenerateCode.isPending}
                      >
                        {regenerateCode.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Coach Invite Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Coach Invite Code
                </CardTitle>
                <CardDescription>
                  Share this code with other coaches to give them full access to manage the team.
                  Keep this code private and only share with trusted individuals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {team.coach_invite_code ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="coach-code">Invite Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coach-code"
                          value={team.coach_invite_code}
                          readOnly
                          className="font-mono text-lg tracking-wider uppercase"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(team.coach_invite_code!, 'Coach invite code')}
                        >
                          {copiedCode === team.coach_invite_code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate Code
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Regenerate coach code?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will invalidate the current code. Anyone with the old code 
                            won't be able to join as a coach. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRegenerateCode('coach')}
                            disabled={regenerateCode.isPending}
                          >
                            {regenerateCode.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Regenerate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <Button 
                    onClick={handleGenerateCoachCode}
                    disabled={generateCoachCode.isPending}
                    className="w-full sm:w-auto"
                  >
                    {generateCoachCode.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Generate Coach Invite Code
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No team selected.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
