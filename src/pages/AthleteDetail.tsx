import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentTeam, isCoach } = useAuth();
  const { data: athletes = [], isLoading } = useTeamAthletes(currentTeam?.id);

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
                    {athlete.first_name} {athlete.last_name}
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

        {/* Workout history would go here */}
        <Card>
          <CardHeader>
            <CardTitle>Workout History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Workout history coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
