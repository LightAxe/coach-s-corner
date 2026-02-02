import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamAthletePersonalWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass, type WorkoutLog } from '@/lib/types';

interface PersonalWorkoutsListProps {
  teamAthleteId: string;
}

const FEELING_MAP: Record<string, string> = {
  great: '😊 Great',
  good: '🙂 Good',
  okay: '😐 Okay',
  tired: '😴 Tired',
  poor: '😞 Poor',
};

const INITIAL_DISPLAY_COUNT = 5;

export function PersonalWorkoutsList({ teamAthleteId }: PersonalWorkoutsListProps) {
  const { data: workouts = [], isLoading } = useTeamAthletePersonalWorkoutLogs(teamAthleteId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedWorkouts = expanded
    ? workouts
    : workouts.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = workouts.length > INITIAL_DISPLAY_COUNT;
  const remainingCount = workouts.length - INITIAL_DISPLAY_COUNT;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Personal Workouts
          {workouts.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {workouts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="font-medium">No personal workouts logged</p>
            <p className="text-sm mt-1">
              This athlete hasn't logged any runs outside of scheduled workouts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedWorkouts.map((workout: WorkoutLog) => (
              <WorkoutEntry key={workout.id} workout={workout} />
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

function WorkoutEntry({ workout }: { workout: WorkoutLog }) {
  const typeLabel = workout.workout_type
    ? workout.workout_type.charAt(0).toUpperCase() + workout.workout_type.slice(1)
    : 'Other';

  const dateStr = workout.workout_date
    ? format(parseISO(workout.workout_date), 'MMM d, yyyy')
    : 'Unknown date';

  const details: string[] = [];
  if (workout.distance_value) {
    details.push(`${workout.distance_value} ${workout.distance_unit || 'mi'}`);
  }
  if (workout.effort_level) {
    details.push(`RPE ${workout.effort_level}`);
  }
  if (workout.how_felt && FEELING_MAP[workout.how_felt]) {
    details.push(FEELING_MAP[workout.how_felt]);
  }

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <Badge
              variant="outline"
              className={cn(
                'capitalize text-xs',
                getWorkoutTypeBadgeClass(workout.workout_type || 'other')
              )}
            >
              {typeLabel}
            </Badge>
            {details.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {details.join(' • ')}
              </span>
            )}
          </div>
          {workout.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{workout.notes}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
