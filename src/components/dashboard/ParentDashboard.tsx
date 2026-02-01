import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Trophy, Activity, ChevronDown, User, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass } from '@/lib/types';
import {
  useLinkedChildren,
  useChildWorkouts,
  useChildWorkoutLogs,
  useChildRaceResults,
  useChildRaces,
  type LinkedChild,
} from '@/hooks/useParentData';

// Helper to format time in seconds to mm:ss or h:mm:ss
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.round((seconds % 1) * 100);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

export function ParentDashboard() {
  const { data: children = [], isLoading: childrenLoading } = useLinkedChildren();
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);

  // Set first child as selected when data loads
  if (!selectedChild && children.length > 0) {
    setSelectedChild(children[0]);
  }

  const teamId = selectedChild?.team_athlete.team_id;
  const teamAthleteId = selectedChild?.team_athlete_id;

  const { data: workouts = [], isLoading: workoutsLoading } = useChildWorkouts(teamId);
  const { data: workoutLogs = [], isLoading: logsLoading } = useChildWorkoutLogs(teamAthleteId);
  const { data: raceResults = [], isLoading: resultsLoading } = useChildRaceResults(teamAthleteId);
  const { data: upcomingRaces = [], isLoading: racesLoading } = useChildRaces(teamId);

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No children linked</h3>
          <p className="text-muted-foreground">
            You haven't linked any athletes yet. Enter a parent link code to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const childName = selectedChild
    ? `${selectedChild.team_athlete.first_name} ${selectedChild.team_athlete.last_name}`
    : '';

  return (
    <div className="space-y-6">
      {/* Child Selector (if multiple) */}
      {children.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Viewing:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                {childName}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {children.map((child) => (
                <DropdownMenuItem
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                >
                  {child.team_athlete.first_name} {child.team_athlete.last_name}
                  {child.team_athlete.teams && (
                    <span className="text-muted-foreground ml-2">
                      ({child.team_athlete.teams.name})
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">
          {childName}'s Dashboard
        </h1>
        <p className="text-muted-foreground">
          {selectedChild?.team_athlete.teams?.name || 'Team'}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Workouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Workouts
            </CardTitle>
            <CardDescription>Scheduled team workouts</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming workouts scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {workouts.slice(0, 5).map((workout) => (
                  <div
                    key={workout.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{workout.title}</span>
                      <Badge
                        variant="outline"
                        className={cn('capitalize text-xs', getWorkoutTypeBadgeClass(workout.type))}
                      >
                        {workout.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(workout.scheduled_date), 'EEEE, MMMM d')}
                    </p>
                    {workout.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {workout.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Races */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Upcoming Races
            </CardTitle>
            <CardDescription>Scheduled competitions</CardDescription>
          </CardHeader>
          <CardContent>
            {racesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : upcomingRaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming races scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingRaces.map((race) => (
                  <div
                    key={race.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <p className="font-medium">{race.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(race.race_date), 'MMM d')}
                      </span>
                      {race.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {race.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workout Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Logged workouts</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : workoutLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workout logs yet
              </p>
            ) : (
              <div className="space-y-3">
                {workoutLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {log.scheduled_workouts?.title || 'Workout'}
                      </span>
                      {log.completion_status && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {log.completion_status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {log.scheduled_workouts?.scheduled_date && (
                        <span>
                          {format(parseISO(log.scheduled_workouts.scheduled_date), 'MMM d')}
                        </span>
                      )}
                      {log.distance_value && (
                        <span>
                          {log.distance_value} {log.distance_unit}
                        </span>
                      )}
                      {log.effort_level && <span>RPE: {log.effort_level}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Race Results / PRs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Race Results
            </CardTitle>
            <CardDescription>Competition times and PRs</CardDescription>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : raceResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No race results yet
              </p>
            ) : (
              <div className="space-y-3">
                {raceResults.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {result.races?.name || 'Race'}
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {formatTime(Number(result.time_seconds))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {result.distances?.name && (
                        <Badge variant="outline" className="text-xs">
                          {result.distances.name}
                        </Badge>
                      )}
                      {result.place && <span>Place: {result.place}</span>}
                      {result.achieved_at && (
                        <span>{format(parseISO(result.achieved_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
