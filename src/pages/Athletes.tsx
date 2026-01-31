import { useState } from 'react';
import { Search, Mail, Users, ChevronRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useDashboardData';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useActiveSeason } from '@/hooks/useSeasons';
import { AddAthleteDialog } from '@/components/athletes/AddAthleteDialog';
import { PendingAccountsSection } from '@/components/athletes/PendingAccountsSection';

export default function Athletes() {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentTeam, isCoach } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(currentTeam?.id);
  const { data: teamAthletes = [], isLoading: athletesLoading } = useTeamAthletes(
    currentTeam?.id, 
    activeSeason?.id
  );

  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const isLoading = membersLoading || athletesLoading;

  // Filter coaches from team_memberships
  const coaches = members.filter(m => m.role === 'coach');
  const filteredCoaches = coaches.filter((member) => {
    const fullName = `${member.profiles.first_name} ${member.profiles.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Filter team athletes
  const filteredAthletes = teamAthletes.filter((athlete) => {
    const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Team Roster</h1>
            <p className="text-muted-foreground">
              {activeSeason ? `Athletes for ${activeSeason.name}` : 'Manage your team members and athletes'}
            </p>
          </div>
          {currentTeam && (
            <AddAthleteDialog teamId={currentTeam.id} seasonId={activeSeason?.id} />
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Pending accounts section - athletes who signed up but aren't linked */}
        {currentTeam && (
          <PendingAccountsSection teamId={currentTeam.id} seasonId={activeSeason?.id} />
        )}

        {/* Coaches section */}
        {(filteredCoaches.length > 0 || isLoading) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coaches
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                [1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredCoaches.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(member.profiles.first_name, member.profiles.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.profiles.first_name} {member.profiles.last_name}
                        </p>
                        {member.profiles.email && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.profiles.email}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Coach</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Athletes section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Athletes ({isLoading ? '...' : filteredAthletes.length})
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAthletes.length === 0 && !searchQuery ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center mb-4">
                  {activeSeason 
                    ? `No athletes for ${activeSeason.name} yet` 
                    : 'No athletes on your team yet. Create a season first.'}
                </p>
                {currentTeam && activeSeason && (
                  <AddAthleteDialog teamId={currentTeam.id} seasonId={activeSeason.id} />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAthletes.map((athlete) => {
                const isLinked = !!athlete.profile_id;
                
                return (
                  <Card key={athlete.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(athlete.first_name, athlete.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {athlete.first_name} {athlete.last_name}
                            </h3>
                            {!isLinked && (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Not in app
                              </Badge>
                            )}
                          </div>
                          
                          {isLinked && athlete.profiles?.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {athlete.profiles.email}
                            </p>
                          )}
                        </div>

                        <Link to={`/athletes/${athlete.id}`}>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && filteredAthletes.length === 0 && filteredCoaches.length === 0 && searchQuery && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center mb-4">
                No members found matching "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
