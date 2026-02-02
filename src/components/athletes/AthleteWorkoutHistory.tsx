import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { History, ChevronDown, ChevronUp, CheckCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamAthleteAllWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass } from '@/lib/types';

interface AthleteWorkoutHistoryProps {
  teamAthleteId: string;
  onLogPersonalWorkout?: () => void;
}

interface ScheduledWorkoutData {
  id: string;
  title: string;
  type: string;
  description: string | null;
  scheduled_date: string;
}

interface WorkoutLogWithScheduled {
  id: string;
  completed: boolean;
  completion_status: string | null;
  created_at: string;
  distance_unit: string | null;
  distance_value: number | null;
  effort_level: number | null;
  how_felt: string | null;
  notes: string | null;
  workout_date: string | null;
  workout_type: string | null;
  scheduled_workout_id: string | null;
  scheduled_workouts: ScheduledWorkoutData | null;
}

const FEELING_MAP: Record<string, string> = {
  great: '💪 Great',
  good: '😊 Good',
  okay: '😐 Okay',
  tired: '😴 Tired',
  poor: '😞 Poor',
  strong: '💪 Strong',
};

const INITIAL_DISPLAY_COUNT = 10;

function getEffectiveDate(log: WorkoutLogWithScheduled): string {
  if (log.workout_date) {
    return log.workout_date;
  }
  if (log.scheduled_workouts?.scheduled_date) {
    return log.scheduled_workouts.scheduled_date;
  }
  return log.created_at;
}

export function AthleteWorkoutHistory({ teamAthleteId, onLogPersonalWorkout }: AthleteWorkoutHistoryProps) {
  const { data: logs = [], isLoading } = useTeamAthleteAllWorkoutLogs(teamAthleteId);
  const [expanded, setExpanded] = useState(false);

  const sortedLogs = useMemo(() => {
    return [...(logs as WorkoutLogWithScheduled[])].sort((a, b) => {
      const dateA = getEffectiveDate(a);
      const dateB = getEffectiveDate(b);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedLogs = expanded
    ? sortedLogs
    : sortedLogs.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = sortedLogs.length > INITIAL_DISPLAY_COUNT;
  const remainingCount = sortedLogs.length - INITIAL_DISPLAY_COUNT;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Training History
            {sortedLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {sortedLogs.length}
              </Badge>
            )}
          </CardTitle>
          {onLogPersonalWorkout && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogPersonalWorkout}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Personal Workout
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-medium">No workout activity logged yet</p>
            <p className="text-sm mt-1">
              This athlete hasn't logged any workouts. Activity will appear here once workouts are completed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLogs.map((log) => (
              <WorkoutHistoryEntry key={log.id} log={log} />
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show {remainingCount} more
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkoutHistoryEntry({ log }: { log: WorkoutLogWithScheduled }) {
  const isScheduled = !!log.scheduled_workouts;
  const effectiveDate = getEffectiveDate(log);

  const dateStr = format(parseISO(effectiveDate), 'MMM d, yyyy');

  const workoutType = isScheduled
    ? log.scheduled_workouts!.type
    : (log.workout_type || 'other');
  const typeLabel = workoutType.charAt(0).toUpperCase() + workoutType.slice(1);

  const title = isScheduled
    ? log.scheduled_workouts!.title
    : 'Personal Run';

  const details: string[] = [];

  if (isScheduled && log.completion_status) {
    const statusLabel = log.completion_status.charAt(0).toUpperCase() + log.completion_status.slice(1);
    details.push(statusLabel);
  }

  if (log.distance_value) {
    details.push(`${log.distance_value} ${log.distance_unit || 'mi'}`);
  }

  if (log.effort_level) {
    details.push(`RPE ${log.effort_level}`);
  }

  if (log.how_felt && FEELING_MAP[log.how_felt]) {
    details.push(FEELING_MAP[log.how_felt]);
  }

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        {isScheduled && (
          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span className="font-medium">{title}</span>
            <Badge
              variant="outline"
              className={cn(
                'capitalize text-xs',
                getWorkoutTypeBadgeClass(workoutType)
              )}
            >
              {typeLabel}
            </Badge>
          </div>
          {details.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {details.join(' • ')}
            </p>
          )}
          {log.notes && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-muted-foreground italic">
              "{log.notes}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
