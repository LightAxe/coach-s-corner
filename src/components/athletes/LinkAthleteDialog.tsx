import { useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { useUnlinkedTeamAthletes, useLinkTeamAthlete } from '@/hooks/useTeamAthletes';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

interface LinkAthleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  profileId: string;
  profileName: string;
  onSuccess?: () => void;
}

export function LinkAthleteDialog({
  open,
  onOpenChange,
  teamId,
  profileId,
  profileName,
  onSuccess,
}: LinkAthleteDialogProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const { toast } = useToast();
  const { data: unlinkedAthletes = [], isLoading } = useUnlinkedTeamAthletes(teamId);
  const linkAthlete = useLinkTeamAthlete();

  const handleLink = async () => {
    if (!selectedAthleteId) return;

    try {
      await linkAthlete.mutateAsync({
        id: selectedAthleteId,
        team_id: teamId,
        profile_id: profileId,
      });

      const athlete = unlinkedAthletes.find(a => a.id === selectedAthleteId);
      toast({
        title: 'Account linked',
        description: `${profileName} has been linked to ${athlete?.first_name} ${athlete?.last_name}'s records.`,
      });

      setSelectedAthleteId('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Failed to link account',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to Existing Athlete
          </DialogTitle>
          <DialogDescription>
            Link {profileName}'s account to an existing athlete record. 
            This will transfer all workout history to their account.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : unlinkedAthletes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No unlinked athletes to connect.
          </p>
        ) : (
          <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an athlete to link" />
            </SelectTrigger>
            <SelectContent>
              {unlinkedAthletes.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.first_name} {athlete.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedAthleteId || linkAthlete.isPending}
          >
            {linkAthlete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
