import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduledWorkoutsRange } from '@/hooks/useDashboardData';
import { getWorkoutTypeBadgeClass } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  const { currentTeam } = useAuth();
  const { data: workouts = [], isLoading } = useScheduledWorkoutsRange(
    currentTeam?.id, 
    weekStart, 
    weekEnd
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWorkoutForDay = (date: Date) => {
    return workouts.find((w) =>
      isSameDay(parseISO(w.scheduled_date), date)
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Training Calendar</h1>
            <p className="text-muted-foreground">
              Plan and schedule your team's workouts
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Workout
          </Button>
        </div>

        {/* Calendar navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={goToToday}>
              Today
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </h2>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const workout = getWorkoutForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <Card 
                key={day.toISOString()} 
                className={cn(
                  'min-h-[200px] transition-all',
                  isToday && 'ring-2 ring-primary'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {format(day, 'EEE')}
                      </p>
                      <p className={cn(
                        'text-lg font-bold',
                        isToday && 'text-primary'
                      )}>
                        {format(day, 'd')}
                      </p>
                    </div>
                    {isToday && (
                      <Badge variant="default" className="text-xs">Today</Badge>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ) : workout ? (
                    <div className="space-y-2">
                      <Badge 
                        variant="outline" 
                        className={cn('capitalize text-xs', getWorkoutTypeBadgeClass(workout.type))}
                      >
                        {workout.type}
                      </Badge>
                      <h3 className="font-medium text-sm">{workout.title}</h3>
                      {workout.distance && (
                        <p className="text-xs text-muted-foreground">{workout.distance}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-workout-easy" />
                <span className="text-sm text-muted-foreground">Easy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-workout-tempo" />
                <span className="text-sm text-muted-foreground">Tempo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-workout-interval" />
                <span className="text-sm text-muted-foreground">Interval</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-workout-long" />
                <span className="text-sm text-muted-foreground">Long Run</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-workout-rest" />
                <span className="text-sm text-muted-foreground">Rest</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
