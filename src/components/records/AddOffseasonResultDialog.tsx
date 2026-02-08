import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDistances } from '@/hooks/useDistances';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useCreateRaceResult } from '@/hooks/useRaceResults';
import { parseTimeToSeconds } from '@/lib/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AddOffseasonResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddOffseasonResultDialog({ open, onOpenChange }: AddOffseasonResultDialogProps) {
  const { user, currentTeam } = useAuth();
  const teamId = currentTeam?.id;
  
  const { data: distances = [] } = useDistances();
  const { data: athletes = [] } = useTeamAthletes(teamId);
  const createResult = useCreateRaceResult();

  const [athleteId, setAthleteId] = useState('');
  const [distanceId, setDistanceId] = useState('');
  const [time, setTime] = useState('');
  const [achievedAt, setAchievedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setAthleteId('');
    setDistanceId('');
    setTime('');
    setAchievedAt(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!athleteId || !distanceId || !time || !achievedAt || !user?.id) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate time format
    const timeSeconds = parseTimeToSeconds(time);
    if (isNaN(timeSeconds) || timeSeconds <= 0) {
      toast.error('Invalid time format. Use MM:SS.cc or H:MM:SS.cc');
      return;
    }

    try {
      await createResult.mutateAsync({
        team_athlete_id: athleteId,
        distance_id: distanceId,
        time_seconds: timeSeconds,
        achieved_at: achievedAt,
        notes: notes || undefined,
        created_by: user.id,
      });
      
      toast.success('Result added successfully');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add result');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Offseason Result</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="athlete">Athlete *</Label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select athlete" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.first_name} {athlete.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance">Distance *</Label>
            <Select value={distanceId} onValueChange={setDistanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent>
                {distances.map(distance => (
                  <SelectItem key={distance.id} value={distance.id}>
                    {distance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time *</Label>
            <Input
              id="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="MM:SS.cc (e.g., 5:23.45)"
            />
            <p className="text-xs text-muted-foreground">
              Format: MM:SS.cc or H:MM:SS.cc
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date Achieved *</Label>
            <Input
              id="date"
              type="date"
              value={achievedAt}
              onChange={e => setAchievedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 500))}
              placeholder="e.g., Meet name, conditions..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createResult.isPending}>
              {createResult.isPending ? 'Adding...' : 'Add Result'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
