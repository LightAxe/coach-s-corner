import { useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ScheduledWorkout, TeamAthleteWithProfile } from '@/lib/types';
import { useWorkoutLogsForWorkout } from '@/hooks/useTeamAthletes';

interface WorkoutComplianceProps {
  workout: ScheduledWorkout | null;
  athletes: TeamAthleteWithProfile[];
  isLoading: boolean;
}

type Status = 'complete' | 'partial' | 'not_logged';

interface AthleteStatus {
  id: string;
  name: string;
  status: Status;
}

export function WorkoutCompliance({ workout, athletes, isLoading }: WorkoutComplianceProps) {
  const { data: logs, isLoading: logsLoading } = useWorkoutLogsForWorkout(workout?.id);

  const athleteStatuses = useMemo((): AthleteStatus[] => {
    if (!athletes.length) return [];

    const logByAthlete = new Map<string, string>();
    if (logs) {
      for (const log of logs) {
        const athleteId = log.team_athlete_id || log.team_athletes?.id;
        if (athleteId) {
          logByAthlete.set(athleteId, log.completion_status || 'none');
        }
      }
    }

    return athletes.map((a) => {
      const completionStatus = logByAthlete.get(a.id);
      let status: Status = 'not_logged';
      if (completionStatus === 'complete') status = 'complete';
      else if (completionStatus === 'partial') status = 'partial';
      else if (completionStatus === 'none') status = 'not_logged';

      return {
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        status,
      };
    }).sort((a, b) => {
      const order: Record<Status, number> = { not_logged: 0, partial: 1, complete: 2 };
      return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
    });
  }, [athletes, logs]);

  const counts = useMemo(() => {
    const complete = athleteStatuses.filter((a) => a.status === 'complete').length;
    const partial = athleteStatuses.filter((a) => a.status === 'partial').length;
    const notLogged = athleteStatuses.filter((a) => a.status === 'not_logged').length;
    return { complete, partial, notLogged };
  }, [athleteStatuses]);

  if (!workout) return null;

  if (isLoading || logsLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Today's Compliance
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {counts.complete}/{athleteStatuses.length} logged
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary bar */}
        {athleteStatuses.length > 0 && (
          <div className="flex gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              {counts.complete}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
              {counts.partial}
            </span>
            <span className="flex items-center gap-1">
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              {counts.notLogged}
            </span>
          </div>
        )}

        {/* Athlete grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {athleteStatuses.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
                a.status === 'complete' && 'bg-green-50 dark:bg-green-950/30',
                a.status === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/30',
                a.status === 'not_logged' && 'bg-muted/50'
              )}
            >
              {a.status === 'complete' && (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
              )}
              {a.status === 'partial' && (
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              )}
              {a.status === 'not_logged' && (
                <Circle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{a.name}</span>
            </div>
          ))}
        </div>

        {athleteStatuses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No athletes on roster
          </p>
        )}
      </CardContent>
    </Card>
  );
}
