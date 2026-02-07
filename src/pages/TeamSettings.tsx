import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, RefreshCw, Users, ShieldCheck, Loader2, Check, Plus, Calendar, Trash2, Star, Pencil, Building2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTeamWithCodes,
  useRegenerateTeamCode,
  useGenerateCoachInviteCode,
  useUpdateTeamName
} from '@/hooks/useTeamSettings';
import { useSeasons, useCreateSeason, useSetActiveSeason, useDeleteSeason } from '@/hooks/useSeasons';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function TeamSettings() {
  const { currentTeam, isCoach, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [createSeasonOpen, setCreateSeasonOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');

  const { data: team, isLoading } = useTeamWithCodes(currentTeam?.id);
  const regenerateCode = useRegenerateTeamCode();
  const generateCoachCode = useGenerateCoachInviteCode();
  const updateTeamName = useUpdateTeamName();

  // Initialize edited name when team data loads
  useEffect(() => {
    if (team?.name) {
      setEditedTeamName(team.name);
    }
  }, [team?.name]);
  
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons(currentTeam?.id);
  const createSeason = useCreateSeason();
  const setActiveSeason = useSetActiveSeason();
  const deleteSeason = useDeleteSeason();

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

  const handleCreateSeason = async () => {
    if (!currentTeam || !user || !newSeasonName.trim()) return;
    try {
      await createSeason.mutateAsync({
        team_id: currentTeam.id,
        name: newSeasonName.trim(),
        created_by: user.id,
        is_active: seasons.length === 0,
      });
      toast({ title: 'Season created' });
      setNewSeasonName('');
      setCreateSeasonOpen(false);
    } catch (error: any) {
      toast({ title: 'Failed to create season', description: error.message, variant: 'destructive' });
    }
  };

  const handleSetActive = async (seasonId: string) => {
    if (!currentTeam) return;
    try {
      await setActiveSeason.mutateAsync({ seasonId, teamId: currentTeam.id });
      toast({ title: 'Active season updated' });
    } catch (error: any) {
      toast({ title: 'Failed to set active season', variant: 'destructive' });
    }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (!currentTeam) return;
    try {
      await deleteSeason.mutateAsync({ id: seasonId, teamId: currentTeam.id });
      toast({ title: 'Season deleted' });
    } catch (error: any) {
      toast({ title: 'Failed to delete season', variant: 'destructive' });
    }
  };

  const handleUpdateTeamName = async () => {
    if (!currentTeam || !editedTeamName.trim()) return;
    try {
      await updateTeamName.mutateAsync({
        teamId: currentTeam.id,
        name: editedTeamName.trim(),
      });
      toast({ title: 'Team name updated' });
      setEditNameOpen(false);
      // Refresh the auth context to update the team name in the sidebar
      await refreshProfile();
    } catch (error: any) {
      toast({
        title: 'Failed to update team name',
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
            Manage your team's join codes, seasons, and settings.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : team ? (
          <div className="space-y-6">
            {/* Team Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Team Information
                </CardTitle>
                <CardDescription>
                  Basic information about your team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <div className="flex gap-2">
                    <Input
                      value={team.name}
                      readOnly
                      className="text-lg font-medium"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditedTeamName(team.name);
                        setEditNameOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      value={team.join_code || ''}
                      readOnly
                      className="font-mono text-lg tracking-wider uppercase"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(team.join_code || '', 'Athlete join code')}
                    >
                      {copiedCode === (team.join_code || '') ? (
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
            {/* Season Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Season Management
                </CardTitle>
                <CardDescription>
                  Create and manage seasons to organize athletes and track records by time period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {seasonsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : seasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No seasons created yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {seasons.map((season) => (
                      <div
                        key={season.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{season.name}</span>
                          {season.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!season.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetActive(season.id)}
                              disabled={setActiveSeason.isPending}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Set Active
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete season?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete "{season.name}". Athletes and data linked to this season may be affected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSeason(season.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={() => setCreateSeasonOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Season
                </Button>
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

        {/* Create Season Dialog */}
        <Dialog open={createSeasonOpen} onOpenChange={setCreateSeasonOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Season</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="season-name">Season Name</Label>
                <Input
                  id="season-name"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="e.g., Fall 2024"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateSeasonOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSeason} disabled={createSeason.isPending || !newSeasonName.trim()}>
                Create Season
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Team Name Dialog */}
        <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={editedTeamName}
                  onChange={(e) => setEditedTeamName(e.target.value)}
                  placeholder="e.g., Lincoln High XC"
                  maxLength={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditNameOpen(false)}>Cancel</Button>
              <Button
                onClick={handleUpdateTeamName}
                disabled={updateTeamName.isPending || !editedTeamName.trim()}
              >
                {updateTeamName.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
