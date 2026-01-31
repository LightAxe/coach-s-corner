import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';
import { ScheduledWorkout, RaceWithDistance, getWorkoutTypeBadgeClass } from '@/lib/types';

interface WeekPreviewProps {
  workouts: ScheduledWorkout[];
  races?: RaceWithDistance[];
  isLoading?: boolean;
}

type CalendarItem = 
  | { type: 'workout'; date: string; data: ScheduledWorkout }
  | { type: 'race'; date: string; data: RaceWithDistance };

export function WeekPreview({ workouts, races = [], isLoading }: WeekPreviewProps) {
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

  // Combine workouts and races into a single sorted list
  const calendarItems: CalendarItem[] = [
    ...workouts.map((w) => ({ type: 'workout' as const, date: w.scheduled_date, data: w })),
    ...races.map((r) => ({ type: 'race' as const, date: r.race_date, data: r })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
        {calendarItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">No workouts or races scheduled this week</p>
            <Link to="/calendar" className="text-sm text-primary hover:underline">
              Schedule your first workout
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {calendarItems.map((item) => {
              const date = parseISO(item.date);
              const today = isToday(date);
              const isRace = item.type === 'race';
              
              return (
                <div
                  key={`${item.type}-${item.data.id}`}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg transition-colors',
                    today ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted',
                    isRace && 'border-l-2 border-l-accent'
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
                    {isRace ? (
                      <>
                        <p className="font-medium text-sm truncate flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-accent" />
                          {(item.data as RaceWithDistance).name}
                        </p>
                        {(item.data as RaceWithDistance).location && (
                          <p className="text-xs text-muted-foreground truncate">
                            {(item.data as RaceWithDistance).location}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-sm truncate">
                          {(item.data as ScheduledWorkout).title}
                        </p>
                        {(item.data as ScheduledWorkout).athlete_notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {(item.data as ScheduledWorkout).athlete_notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {isRace ? (
                    <Badge variant="outline" className="text-xs border-accent text-accent">
                      Race
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={cn('capitalize text-xs', getWorkoutTypeBadgeClass((item.data as ScheduledWorkout).type))}
                    >
                      {(item.data as ScheduledWorkout).type}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
