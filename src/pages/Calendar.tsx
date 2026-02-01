import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trophy } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduledWorkoutsRange } from '@/hooks/useDashboardData';
import { useRacesRange } from '@/hooks/useRaces';
import { getWorkoutTypeBadgeClass, type RaceWithDistance, type ScheduledWorkout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AddCalendarItemDialog } from '@/components/calendar/AddCalendarItemDialog';
import { RaceCard } from '@/components/races/RaceCard';
import { RaceDetailDialog } from '@/components/races/RaceDetailDialog';
import { WorkoutLogDialog } from '@/components/workouts/WorkoutLogDialog';
import { WorkoutDetailDialog } from '@/components/workouts/WorkoutDetailDialog';
import { EditWorkoutDialog } from '@/components/workouts/EditWorkoutDialog';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRace, setSelectedRace] = useState<RaceWithDistance | null>(null);
  const [raceDetailOpen, setRaceDetailOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<ScheduledWorkout | null>(null);
  const [workoutLogOpen, setWorkoutLogOpen] = useState(false);
  const [workoutDetailOpen, setWorkoutDetailOpen] = useState(false);
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false);
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  const { currentTeam, isCoach } = useAuth();
  const { data: workouts = [], isLoading: workoutsLoading } = useScheduledWorkoutsRange(
    currentTeam?.id, 
    weekStart, 
    weekEnd
  );
  const { data: races = [], isLoading: racesLoading } = useRacesRange(
    currentTeam?.id,
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  const isLoading = workoutsLoading || racesLoading;
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

  const getRaceForDay = (date: Date) => {
    return races.find((r) =>
      isSameDay(parseISO(r.race_date), date)
    );
  };

  const handleAddItem = (date?: Date) => {
    setSelectedDate(date || new Date());
    setAddItemOpen(true);
  };

  const handleRaceClick = (race: RaceWithDistance) => {
    setSelectedRace(race);
    setRaceDetailOpen(true);
  };

  const handleWorkoutClick = (workout: ScheduledWorkout) => {
    setSelectedWorkout(workout);
    if (isCoach) {
      // Coaches see detail dialog with edit/delete options
      setWorkoutDetailOpen(true);
    } else {
      // Athletes can log workouts
      setWorkoutLogOpen(true);
    }
  };

  const handleEditWorkout = () => {
    setEditWorkoutOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Training Calendar</h1>
            <p className="text-muted-foreground">
              Plan workouts and races for your team
            </p>
          </div>
          {isCoach && (
            <Button className="gap-2" onClick={() => handleAddItem()}>
              <Plus className="h-4 w-4" />
              Add to Calendar
            </Button>
          )}
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
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 lg:gap-4">
          {weekDays.map((day) => {
            const workout = getWorkoutForDay(day);
            const race = getRaceForDay(day);
            const isToday = isSameDay(day, new Date());
            const hasItem = workout || race;

            return (
              <Card
                key={day.toISOString()}
                className={cn(
                  'min-h-[120px] lg:min-h-[200px] transition-all',
                  isToday && 'ring-2 ring-primary',
                  race && 'border-accent'
                )}
              >
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="flex items-center gap-2 lg:block">
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
                  ) : race ? (
                    <div onClick={() => handleRaceClick(race)} className="cursor-pointer">
                      <RaceCard race={race} compact />
                    </div>
                  ) : workout ? (
                    <div 
                      className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleWorkoutClick(workout)}
                    >
                      <Badge 
                        variant="outline" 
                        className={cn('capitalize text-xs', getWorkoutTypeBadgeClass(workout.type))}
                      >
                        {workout.type}
                      </Badge>
                      <h3 className="font-medium text-sm">{workout.title}</h3>
                      {workout.athlete_notes && (
                        <p className="text-xs text-muted-foreground truncate">{workout.athlete_notes}</p>
                      )}
                      <p className="text-xs text-primary">
                        {isCoach ? 'Click to edit' : 'Click to log'}
                      </p>
                    </div>
                  ) : isCoach ? (
                    <div
                      className="flex items-center justify-center h-14 lg:h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleAddItem(day)}
                    >
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-14 lg:h-20 text-muted-foreground text-sm">
                      Rest day
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs lg:text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-workout-easy" />
                <span className="text-muted-foreground">Easy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-workout-tempo" />
                <span className="text-muted-foreground">Tempo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-workout-interval" />
                <span className="text-muted-foreground">Interval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-workout-long" />
                <span className="text-muted-foreground">Long</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-workout-rest" />
                <span className="text-muted-foreground">Rest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-accent" />
                <span className="text-muted-foreground">Race</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <AddCalendarItemDialog 
          open={addItemOpen} 
          onOpenChange={setAddItemOpen}
          initialDate={selectedDate}
        />

        <RaceDetailDialog
          race={selectedRace}
          open={raceDetailOpen}
          onOpenChange={setRaceDetailOpen}
        />

        <WorkoutLogDialog
          open={workoutLogOpen}
          onOpenChange={setWorkoutLogOpen}
          workout={selectedWorkout}
        />

        <WorkoutDetailDialog
          open={workoutDetailOpen}
          onOpenChange={setWorkoutDetailOpen}
          workout={selectedWorkout}
          teamId={currentTeam?.id || ''}
          onEdit={handleEditWorkout}
        />

        <EditWorkoutDialog
          open={editWorkoutOpen}
          onOpenChange={setEditWorkoutOpen}
          workout={selectedWorkout}
          teamId={currentTeam?.id || ''}
        />
      </div>
    </AppLayout>
  );
}
