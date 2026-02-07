import { useState } from 'react';
import { UserPlus, Link2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUnlinkedTeamMembers } from '@/hooks/useTeamSettings';
import { useUnlinkedTeamAthletes, useLinkTeamAthlete, useCreateTeamAthlete } from '@/hooks/useTeamAthletes';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PendingAccountsSectionProps {
  teamId: string;
  seasonId?: string | null;
}

export function PendingAccountsSection({ teamId, seasonId }: PendingAccountsSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: activeSeason } = useActiveSeason(teamId);
  const [linkingMember, setLinkingMember] = useState<{
    profileId: string;
    name: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  const { data: unlinkedMembers = [], isLoading: membersLoading } = useUnlinkedTeamMembers(teamId, seasonId);
  const { data: unlinkedAthletes = [], isLoading: athletesLoading } = useUnlinkedTeamAthletes(teamId);
  const linkAthlete = useLinkTeamAthlete();
  const createAthlete = useCreateTeamAthlete();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleOpenLinkDialog = (profileId: string, firstName: string, lastName: string) => {
    setLinkingMember({ profileId, name: `${firstName} ${lastName}`, firstName, lastName });
    setSelectedAthleteId('');
  };

  const handleLink = async () => {
    if (!linkingMember || !selectedAthleteId) return;

    try {
      await linkAthlete.mutateAsync({
        id: selectedAthleteId,
        team_id: teamId,
        profile_id: linkingMember.profileId,
      });

      const athlete = unlinkedAthletes.find(a => a.id === selectedAthleteId);
      toast({
        title: 'Account linked',
        description: `${linkingMember.name} has been linked to ${athlete?.first_name} ${athlete?.last_name}'s records.`,
      });

      setLinkingMember(null);
      setSelectedAthleteId('');
    } catch (error: any) {
      toast({
        title: 'Failed to link account',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateAndLink = async () => {
    if (!linkingMember || !user) return;

    try {
      const athlete = await createAthlete.mutateAsync({
        team_id: teamId,
        first_name: linkingMember.firstName,
        last_name: linkingMember.lastName,
        created_by: user.id,
        season_id: activeSeason?.id || null,
      });

      await linkAthlete.mutateAsync({
        id: athlete.id,
        team_id: teamId,
        profile_id: linkingMember.profileId,
      });

      toast({
        title: 'Account linked',
        description: `Created roster entry and linked ${linkingMember.name}'s account.`,
      });

      setLinkingMember(null);
      setSelectedAthleteId('');
    } catch (error: any) {
      toast({
        title: 'Failed to create and link',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if no pending accounts
  if (unlinkedMembers.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Pending Accounts
            <Badge variant="secondary" className="ml-2">
              {unlinkedMembers.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            These athletes have signed up but haven't been linked to roster records yet.
            Link them to transfer their workout history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unlinkedMembers.map((member) => (
              <div 
                key={member.membershipId} 
                className="flex items-center justify-between gap-4 p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    {member.email && (
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLinkDialog(member.profileId, member.firstName, member.lastName)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Link to Roster
                </Button>
              </div>
            ))}

          </div>
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={!!linkingMember} onOpenChange={(open) => !open && setLinkingMember(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Account to Roster
            </DialogTitle>
            <DialogDescription>
              Link {linkingMember?.name}'s account to an existing roster entry.
              This will transfer all workout history to their account.
            </DialogDescription>
          </DialogHeader>

          {athletesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : unlinkedAthletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unlinked roster entries available. You can create a new roster entry for this athlete.
            </p>
          ) : (
            <div className="space-y-3">
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a roster entry" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedAthletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.first_name} {athlete.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setLinkingMember(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleCreateAndLink}
              disabled={createAthlete.isPending || linkAthlete.isPending}
            >
              {createAthlete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" />
              Create & Link
            </Button>
            {unlinkedAthletes.length > 0 && (
              <Button
                onClick={handleLink}
                disabled={!selectedAthleteId || linkAthlete.isPending}
              >
                {linkAthlete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
