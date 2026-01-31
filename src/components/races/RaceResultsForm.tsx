import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useActiveSeason } from '@/hooks/useSeasons';
import { useRaceResults, useCreateRaceResults, useUpdateRaceResult, useDeleteRaceResult } from '@/hooks/useRaceResults';
import { parseTimeToSeconds, formatTime } from '@/lib/types';
import { toast } from 'sonner';
import { Trash2, Save, UserCircle } from 'lucide-react';

interface AthleteResult {
  athleteId: string;
  athleteName: string;
  time: string;
  place: string;
  existingResultId?: string;
}

interface RaceResultsFormProps {
  raceId: string;
  teamId: string;
  onSaved?: () => void;
}

export function RaceResultsForm({ raceId, teamId, onSaved }: RaceResultsFormProps) {
  const { user, isCoach } = useAuth();
  const { data: activeSeason } = useActiveSeason(teamId);
  const { data: athletes = [] } = useTeamAthletes(teamId, activeSeason?.id);
  const { data: existingResults = [], isLoading } = useRaceResults(raceId);
  const createResults = useCreateRaceResults();
  const updateResult = useUpdateRaceResult();
  const deleteResult = useDeleteRaceResult();

  const [results, setResults] = useState<AthleteResult[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize results from athletes and existing data
  useEffect(() => {
    if (athletes.length > 0) {
      const athleteResults: AthleteResult[] = athletes.map(athlete => {
        const existing = existingResults.find(
          (r: any) => r.team_athlete_id === athlete.id
        );
        return {
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          time: existing ? formatTime(Number(existing.time_seconds)) : '',
          place: existing?.place?.toString() || '',
          existingResultId: existing?.id,
        };
      });
      setResults(athleteResults);
    }
  }, [athletes, existingResults]);

  const updateAthleteResult = (athleteId: string, field: 'time' | 'place', value: string) => {
    setResults(prev =>
      prev.map(r =>
        r.athleteId === athleteId ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const toCreate: any[] = [];
      const toUpdate: any[] = [];

      for (const result of results) {
        if (!result.time) continue; // Skip empty entries

        const timeSeconds = parseTimeToSeconds(result.time);
        if (isNaN(timeSeconds) || timeSeconds <= 0) {
          toast.error(`Invalid time for ${result.athleteName}`);
          setSaving(false);
          return;
        }

        const place = result.place ? parseInt(result.place) : undefined;

        if (result.existingResultId) {
          // Update existing
          toUpdate.push({
            id: result.existingResultId,
            time_seconds: timeSeconds,
            place,
          });
        } else {
          // Create new
          toCreate.push({
            race_id: raceId,
            team_athlete_id: result.athleteId,
            time_seconds: timeSeconds,
            place,
            created_by: user.id,
          });
        }
      }

      // Execute updates
      for (const update of toUpdate) {
        await updateResult.mutateAsync(update);
      }

      // Batch create new results
      if (toCreate.length > 0) {
        await createResults.mutateAsync(toCreate);
      }

      toast.success('Results saved successfully');
      onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (result: AthleteResult) => {
    if (!result.existingResultId) return;

    try {
      await deleteResult.mutateAsync({
        id: result.existingResultId,
        race_id: raceId,
        team_athlete_id: result.athleteId,
      });
      toast.success('Result deleted');
    } catch (error) {
      toast.error('Failed to delete result');
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-4">Loading results...</p>;
  }

  if (athletes.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No athletes in the current season. Add athletes first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px_80px_40px] gap-2 px-2 text-sm font-medium text-muted-foreground">
        <span>Athlete</span>
        <span>Time</span>
        <span>Place</span>
        <span></span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {results.map(result => (
          <Card key={result.athleteId} className="bg-muted/30">
            <CardContent className="p-2">
              <div className="grid grid-cols-[1fr_120px_80px_40px] gap-2 items-center">
                <div className="flex items-center gap-2 truncate">
                  <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm">{result.athleteName}</span>
                </div>
                <Input
                  value={result.time}
                  onChange={e => updateAthleteResult(result.athleteId, 'time', e.target.value)}
                  placeholder="MM:SS.cc"
                  className="h-8 text-sm"
                  disabled={!isCoach}
                />
                <Input
                  value={result.place}
                  onChange={e => updateAthleteResult(result.athleteId, 'place', e.target.value)}
                  placeholder="#"
                  type="number"
                  min="1"
                  className="h-8 text-sm"
                  disabled={!isCoach}
                />
                {isCoach && result.existingResultId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(result)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isCoach && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Results'}
          </Button>
        </div>
      )}
    </div>
  );
}
