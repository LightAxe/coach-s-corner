import { useState } from 'react';
import { CheckCircle, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScheduledWorkout, getWorkoutTypeBadgeClass } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkoutLogForProfile } from '@/hooks/useWorkoutLogs';
import { WorkoutLogDialog } from '@/components/workouts/WorkoutLogDialog';
import { getFeelingDisplay } from '@/components/workouts/FeelingSelector';

interface TodayWorkoutProps {
  workout?: ScheduledWorkout | null;
  isLoading?: boolean;
}

export function TodayWorkout({ workout, isLoading }: TodayWorkoutProps) {
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const { user, isCoach } = useAuth();
  
  const { data: existingLog, isLoading: logLoading } = useWorkoutLogForProfile(
    workout?.id,
    user?.id
  );

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-muted" />
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workout) {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            No workout scheduled for today
          </p>
        </CardContent>
      </Card>
    );
  }

  const typeLabel = workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
  const hasLogged = !!existingLog;

  return (
    <>
      <Card className="overflow-hidden">
        <div className={cn('h-1', `bg-workout-${workout.type}`)} />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Today's Workout</p>
              <CardTitle className="text-xl">{workout.title}</CardTitle>
            </div>
            <Badge 
              variant="outline" 
              className={cn('capitalize', getWorkoutTypeBadgeClass(workout.type))}
            >
              {typeLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workout.description && (
            <p className="text-muted-foreground">{workout.description}</p>
          )}
          
          {workout.athlete_notes && (
            <div className="text-sm text-muted-foreground italic">
              {workout.athlete_notes}
            </div>
          )}

          {/* Show log status or log button for non-coach users */}
          {!isCoach && (
            <div className="pt-2 border-t">
              {hasLogged ? (
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      <span>Logged</span>
                      {existingLog.completion_status === 'complete' && (
                        <Badge variant="secondary" className="text-xs">Complete</Badge>
                      )}
                      {existingLog.completion_status === 'partial' && (
                        <Badge variant="secondary" className="text-xs">Partial</Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLogDialogOpen(true)}
                    >
                      Edit
                    </Button>
                  </div>
                  
                  {/* Quick stats from log */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {existingLog.distance_value && (
                      <span>{existingLog.distance_value} {existingLog.distance_unit}</span>
                    )}
                    {existingLog.effort_level && (
                      <span>RPE: {existingLog.effort_level}/10</span>
                    )}
                    {existingLog.how_felt && (
                      <span>{getFeelingDisplay(existingLog.how_felt)}</span>
                    )}
                  </div>
                </div>
              ) : (
                <Button 
                  className="w-full gap-2" 
                  onClick={() => setLogDialogOpen(true)}
                  disabled={logLoading}
                >
                  <ClipboardList className="h-4 w-4" />
                  Log Workout
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <WorkoutLogDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        workout={workout}
      />
    </>
  );
}
