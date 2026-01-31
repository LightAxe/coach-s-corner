import { Link } from 'react-router-dom';
import { ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';
import { ScheduledWorkout, getWorkoutTypeBadgeClass } from '@/lib/types';

interface WeekPreviewProps {
  workouts: ScheduledWorkout[];
  isLoading?: boolean;
}

export function WeekPreview({ workouts, isLoading }: WeekPreviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <div className="text-center w-12">
                  <Skeleton className="h-3 w-8 mx-auto mb-1" />
                  <Skeleton className="h-5 w-6 mx-auto" />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedWorkouts = [...workouts].sort((a, b) => 
    new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">This Week</CardTitle>
          <Link 
            to="/calendar" 
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View Calendar
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {sortedWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">No workouts scheduled this week</p>
            <Link to="/calendar" className="text-sm text-primary hover:underline">
              Schedule your first workout
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedWorkouts.map((workout) => {
              const date = parseISO(workout.scheduled_date);
              const today = isToday(date);
              
              return (
                <div
                  key={workout.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg transition-colors',
                    today ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted'
                  )}
                >
                  <div className="text-center w-12 shrink-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {format(date, 'EEE')}
                    </p>
                    <p className={cn(
                      'text-lg font-semibold',
                      today && 'text-primary'
                    )}>
                      {format(date, 'd')}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{workout.title}</p>
                    {workout.athlete_notes && (
                      <p className="text-xs text-muted-foreground truncate">{workout.athlete_notes}</p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('capitalize text-xs', getWorkoutTypeBadgeClass(workout.type))}
                  >
                    {workout.type}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
