import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { PRESET_DISTANCES } from '@/hooks/useDistances';
import { parseTimeToSeconds } from '@/lib/types';

const prSchema = z.object({
  athleteId: z.string().min(1, 'Please select an athlete'),
  distance: z.string().min(1, 'Distance is required'),
  customDistance: z.string().optional(),
  time: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Time must be in MM:SS or H:MM:SS format'),
  achievedAt: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type PRFormData = z.infer<typeof prSchema>;

interface AddPRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | undefined;
  seasonId: string | undefined;
}

export function AddPRDialog({ open, onOpenChange, teamId, seasonId }: AddPRDialogProps) {
  const queryClient = useQueryClient();
  const { data: athletes = [] } = useTeamAthletes(teamId);
  const [useCustomDistance, setUseCustomDistance] = useState(false);
  
  const form = useForm<PRFormData>({
    resolver: zodResolver(prSchema),
    defaultValues: {
      athleteId: '',
      distance: '',
      customDistance: '',
      time: '',
      achievedAt: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });
  
  const createPR = useMutation({
    mutationFn: async (data: PRFormData) => {
      const athlete = athletes.find(a => a.id === data.athleteId);
      if (!athlete) throw new Error('Athlete not found');
      
      const distance = useCustomDistance ? data.customDistance : data.distance;
      if (!distance) throw new Error('Distance is required');
      
      const timeSeconds = parseTimeToSeconds(data.time);
      
      const prData = {
        distance,
        time_seconds: timeSeconds,
        achieved_at: data.achievedAt,
        notes: data.notes || null,
        season_id: seasonId || null,
        // Set either profile_id or team_athlete_id based on athlete type
        profile_id: athlete.profile_id || null,
        team_athlete_id: athlete.profile_id ? null : athlete.id,
      };
      
      const { data: pr, error } = await supabase
        .from('prs')
        .insert(prData)
        .select()
        .single();
      
      if (error) throw error;
      return pr;
    },
    onSuccess: () => {
      toast.success('PR added successfully!');
      queryClient.invalidateQueries({ queryKey: ['distances-with-prs'] });
      queryClient.invalidateQueries({ queryKey: ['pr-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-prs'] });
      form.reset();
      setUseCustomDistance(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to add PR: ' + error.message);
    },
  });
  
  const onSubmit = (data: PRFormData) => {
    createPR.mutate(data);
  };
  
  const handleDistanceChange = (value: string) => {
    if (value === 'custom') {
      setUseCustomDistance(true);
      form.setValue('distance', '');
    } else {
      setUseCustomDistance(false);
      form.setValue('distance', value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Personal Record</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Athlete selector */}
          <div className="space-y-2">
            <Label htmlFor="athlete">Athlete</Label>
            <Select 
              value={form.watch('athleteId')} 
              onValueChange={(v) => form.setValue('athleteId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select athlete..." />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.first_name} {athlete.last_name}
                    {!athlete.profile_id && ' (not in app)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.athleteId && (
              <p className="text-sm text-destructive">{form.formState.errors.athleteId.message}</p>
            )}
          </div>
          
          {/* Distance selector */}
          <div className="space-y-2">
            <Label htmlFor="distance">Distance</Label>
            <Select 
              value={useCustomDistance ? 'custom' : form.watch('distance')} 
              onValueChange={handleDistanceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select distance..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_DISTANCES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
                <SelectItem value="custom">Custom distance...</SelectItem>
              </SelectContent>
            </Select>
            
            {useCustomDistance && (
              <Input
                placeholder="e.g., 800m, 10K, Half Marathon"
                {...form.register('customDistance')}
                className="mt-2"
              />
            )}
            {form.formState.errors.distance && (
              <p className="text-sm text-destructive">{form.formState.errors.distance.message}</p>
            )}
          </div>
          
          {/* Time input */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              placeholder="MM:SS or H:MM:SS"
              {...form.register('time')}
            />
            {form.formState.errors.time && (
              <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>
            )}
          </div>
          
          {/* Date input */}
          <div className="space-y-2">
            <Label htmlFor="achievedAt">Date Achieved</Label>
            <Input
              type="date"
              {...form.register('achievedAt')}
            />
            {form.formState.errors.achievedAt && (
              <p className="text-sm text-destructive">{form.formState.errors.achievedAt.message}</p>
            )}
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              placeholder="Race name, conditions, etc."
              {...form.register('notes')}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPR.isPending}>
              {createPR.isPending ? 'Adding...' : 'Add PR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
