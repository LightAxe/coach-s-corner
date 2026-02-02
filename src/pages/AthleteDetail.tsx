import { useState } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Calendar, ClipboardList, CheckCircle, Users, Pencil, UserMinus, Plus } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useScheduledWorkoutsRange } from '@/hooks/useDashboardData';
import { useTeamAthleteWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { WorkoutLogDialog } from '@/components/workouts/WorkoutLogDialog';
import { PersonalWorkoutDialog } from '@/components/workouts/PersonalWorkoutDialog';
import { GenerateParentCodeDialog } from '@/components/athletes/GenerateParentCodeDialog';
import { EditAthleteDialog } from '@/components/athletes/EditAthleteDialog';
import { RemoveAthleteDialog } from '@/components/athletes/RemoveAthleteDialog';
import { ACWRIndicator } from '@/components/athletes/ACWRIndicator';
import { AthleteWorkoutHistory } from '@/components/athletes/AthleteWorkoutHistory';
import { cn } from '@/lib/utils';
import { getWorkoutTypeBadgeClass, type ScheduledWorkout, type TeamAthleteWithProfile } from '@/lib/types';

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTeam, isCoach } = useAuth();
  const { data: athletes = [], isLoading } = useTeamAthletes(currentTeam?.id);
  
  const [selectedWorkout, setSelectedWorkout] = useState<ScheduledWorkout | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [personalWorkoutDialogOpen, setPersonalWorkoutDialogOpen] = useState(false);
  const [parentCodeDialogOpen, setParentCodeDialogOpen] = useState(false);
  const [editAthleteOpen, setEditAthleteOpen] = useState(false);
  const [removeAthleteOpen, setRemoveAthleteOpen] = useState(false);

  // Get recent workouts for the team (last 14 days)
  const { data: recentWorkouts = [], isLoading: workoutsLoading } = useScheduledWorkoutsRange(
    currentTeam?.id,
    subDays(new Date(), 14),
    new Date()
  );

  // Get workout logs for this athlete
  const { data: athleteLogs = [] } = useTeamAthleteWorkoutLogs(id, { limit: 50 });

  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const athlete = athletes.find(a => a.id === id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!athlete) {
    return <Navigate to="/athletes" replace />;
  }

  const isLinked = !!athlete.profile_id;
  const getInitials = (firstName: string, lastName: string) => 
    `${firstName[0]}${lastName[0]}`.toUpperCase();
  
  const athleteName = `${athlete.first_name} ${athlete.last_name}`;

  // Check if a workout has been logged for this athlete
  const getLogForWorkout = (workoutId: string) => 
    athleteLogs.find(log => log.scheduled_workout_id === workoutId);

  const handleLogWorkout = (workout: ScheduledWorkout) => {
    setSelectedWorkout(workout);
    setLogDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Link to="/athletes">
          <Button variant="ghost" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Athletes
          </Button>
        </Link>

        {/* Athlete info card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials(athlete.first_name, athlete.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-2xl">
                    {athleteName}
                  </CardTitle>
                  {!isLinked && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not in app
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Added {format(new Date(athlete.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditAthleteOpen(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParentCodeDialogOpen(true)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Parent Access
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRemoveAthleteOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLinked && athlete.profiles ? (
              <div className="space-y-2">
                {athlete.profiles.email && (
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {athlete.profiles.email}
                  </p>
                )}
                {athlete.profiles.phone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {athlete.profiles.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                This athlete hasn't joined the app yet. Their workout data is tracked by coaches.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ACWR Training Load Indicator */}
        <ACWRIndicator teamAthleteId={id!} />

        {/* Recent Workouts with Log Ability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workoutsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workouts scheduled in the last 14 days.
              </p>
            ) : (
              <div className="space-y-3">
                {recentWorkouts.map(workout => {
                  const log = getLogForWorkout(workout.id);
                  const hasLog = !!log;
                  const typeLabel = workout.type.charAt(0).toUpperCase() + workout.type.slice(1);
                  
                  return (
                    <div 
                      key={workout.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{workout.title}</span>
                          <Badge 
                            variant="outline" 
                            className={cn('capitalize text-xs', getWorkoutTypeBadgeClass(workout.type))}
                          >
                            {typeLabel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(workout.scheduled_date), 'EEE, MMM d')}
                        </p>
                        {hasLog && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {log.completion_status && (
                              <span className="capitalize">{log.completion_status}</span>
                            )}
                            {log.distance_value && (
                              <span>{log.distance_value} {log.distance_unit}</span>
                            )}
                            {log.effort_level && (
                              <span>RPE: {log.effort_level}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {hasLog && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                        <Button 
                          variant={hasLog ? "ghost" : "outline"} 
                          size="sm"
                          onClick={() => handleLogWorkout(workout)}
                        >
                          {hasLog ? 'Edit' : 'Log'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training History - unified view of all logged workouts */}
        <AthleteWorkoutHistory
          teamAthleteId={id!}
          onLogPersonalWorkout={() => setPersonalWorkoutDialogOpen(true)}
        />
      </div>

      <WorkoutLogDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        workout={selectedWorkout}
        teamAthleteId={id}
        athleteName={athleteName}
      />

      <PersonalWorkoutDialog
        open={personalWorkoutDialogOpen}
        onOpenChange={setPersonalWorkoutDialogOpen}
        teamAthleteId={id}
        athleteName={athleteName}
      />

      <GenerateParentCodeDialog
        open={parentCodeDialogOpen}
        onOpenChange={setParentCodeDialogOpen}
        teamAthleteId={id!}
        athleteName={athleteName}
      />

      <EditAthleteDialog
        open={editAthleteOpen}
        onOpenChange={setEditAthleteOpen}
        athlete={athlete as TeamAthleteWithProfile}
        teamId={currentTeam?.id || ''}
      />

      <RemoveAthleteDialog
        open={removeAthleteOpen}
        onOpenChange={setRemoveAthleteOpen}
        athlete={athlete as TeamAthleteWithProfile}
        teamId={currentTeam?.id || ''}
        onRemoved={() => navigate('/athletes')}
      />
    </AppLayout>
  );
}
