import { Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScheduledWorkout, getWorkoutTypeBadgeClass } from '@/lib/types';

interface TodayWorkoutProps {
  workout?: ScheduledWorkout | null;
  isLoading?: boolean;
}

export function TodayWorkout({ workout, isLoading }: TodayWorkoutProps) {
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
        {workout.description && (
          <p className="text-muted-foreground">{workout.description}</p>
        )}
        
        <div className="flex flex-wrap gap-4">
          {workout.distance && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{workout.distance}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
