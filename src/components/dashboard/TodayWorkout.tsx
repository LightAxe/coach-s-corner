import { Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Workout, getWorkoutTypeBadgeClass } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface TodayWorkoutProps {
  workout?: Workout;
}

export function TodayWorkout({ workout }: TodayWorkoutProps) {
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

  return (
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
        <p className="text-muted-foreground">{workout.description}</p>
        
        <div className="flex flex-wrap gap-4">
          {workout.distance && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{workout.distance}</span>
            </div>
          )}
          {workout.duration && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{workout.duration}</span>
            </div>
          )}
        </div>

        {workout.notes && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Coach's Note:</span> {workout.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
