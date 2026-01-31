import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useActiveSeason } from '@/hooks/useSeasons';
import { useDistances } from '@/hooks/useDistances';
import { useRaceResults, useCreateRaceResults, useUpdateRaceResult, useDeleteRaceResult } from '@/hooks/useRaceResults';
import { parseTimeToSeconds, formatTime } from '@/lib/types';
import { toast } from 'sonner';
import { Trash2, Save, UserCircle } from 'lucide-react';

interface AthleteResult {
  athleteId: string;
  athleteName: string;
  time: string;
  place: string;
  distanceId: string;
  existingResultId?: string;
}

interface RaceResultsFormProps {
  raceId: string;
  teamId: string;
  defaultDistanceId: string;
  onSaved?: () => void;
}

export function RaceResultsForm({ raceId, teamId, defaultDistanceId, onSaved }: RaceResultsFormProps) {
  const { user, isCoach } = useAuth();
  const { data: activeSeason } = useActiveSeason(teamId);
  const { data: athletes = [], isLoading: athletesLoading } = useTeamAthletes(teamId, activeSeason?.id);
  const { data: distances = [] } = useDistances();
  const { data: existingResults = [], isLoading: resultsLoading } = useRaceResults(raceId);
  const createResults = useCreateRaceResults();
  const updateResult = useUpdateRaceResult();
  const deleteResult = useDeleteRaceResult();

  const [results, setResults] = useState<AthleteResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize results from athletes and existing data - only once when data loads
  useEffect(() => {
    if (athletes.length > 0 && !initialized) {
      const athleteResults: AthleteResult[] = athletes.map(athlete => {
        const existing = existingResults.find(
          (r: any) => r.team_athlete_id === athlete.id
        );
        return {
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          time: existing ? formatTime(Number(existing.time_seconds)) : '',
          place: existing?.place?.toString() || '',
          distanceId: existing?.distance_id || defaultDistanceId,
          existingResultId: existing?.id,
        };
      });
      setResults(athleteResults);
      setInitialized(true);
    }
  }, [athletes, existingResults, defaultDistanceId, initialized]);

  const updateAthleteResult = (athleteId: string, field: 'time' | 'place' | 'distanceId', value: string) => {
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
        if (!result.time) continue;

        const timeSeconds = parseTimeToSeconds(result.time);
        if (isNaN(timeSeconds) || timeSeconds <= 0) {
          toast.error(`Invalid time for ${result.athleteName}`);
          setSaving(false);
          return;
        }

        const place = result.place ? parseInt(result.place) : undefined;

        if (result.existingResultId) {
          toUpdate.push({
            id: result.existingResultId,
            time_seconds: timeSeconds,
            place,
            distance_id: result.distanceId,
          });
        } else {
          toCreate.push({
            race_id: raceId,
            team_athlete_id: result.athleteId,
            time_seconds: timeSeconds,
            place,
            distance_id: result.distanceId,
            created_by: user.id,
          });
        }
      }

      for (const update of toUpdate) {
        await updateResult.mutateAsync(update);
      }

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

  const isLoading = athletesLoading || resultsLoading;

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-4">Loading...</p>;
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
      <div className="grid grid-cols-[1fr_100px_100px_60px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground">
        <span>Athlete</span>
        <span>Distance</span>
        <span>Time</span>
        <span>Place</span>
        <span></span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {results.map(result => (
          <Card key={result.athleteId} className="bg-muted/30">
            <CardContent className="p-2">
              <div className="grid grid-cols-[1fr_100px_100px_60px_40px] gap-2 items-center">
                <div className="flex items-center gap-2 truncate">
                  <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm">{result.athleteName}</span>
                </div>
                <Select
                  value={result.distanceId}
                  onValueChange={v => updateAthleteResult(result.athleteId, 'distanceId', v)}
                  disabled={!isCoach}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {distances.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={result.time}
                  onChange={e => updateAthleteResult(result.athleteId, 'time', e.target.value)}
                  placeholder="MM:SS.cc"
                  className="h-8 text-xs"
                  disabled={!isCoach}
                />
                <Input
                  value={result.place}
                  onChange={e => updateAthleteResult(result.athleteId, 'place', e.target.value)}
                  placeholder="#"
                  type="number"
                  min="1"
                  className="h-8 text-xs"
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
