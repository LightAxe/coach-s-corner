import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Workout, getWorkoutTypeBadgeClass } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';

interface WeekPreviewProps {
  workouts: Workout[];
}

export function WeekPreview({ workouts }: WeekPreviewProps) {
  const sortedWorkouts = [...workouts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
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
        <div className="space-y-2">
          {sortedWorkouts.map((workout) => {
            const date = parseISO(workout.date);
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
                  {workout.distance && (
                    <p className="text-xs text-muted-foreground">{workout.distance}</p>
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
      </CardContent>
    </Card>
  );
}
