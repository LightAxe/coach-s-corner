import { useState } from 'react';
import { Search, UserPlus, Mail, Users, Trophy, ChevronRight } from 'lucide-react';
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

export default function Athletes() {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentTeam, isCoach } = useAuth();
  const { data: members = [], isLoading } = useTeamMembers(currentTeam?.id);

  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.profiles.first_name} ${member.profiles.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const athletes = filteredMembers.filter(m => m.role === 'athlete');
  const coaches = filteredMembers.filter(m => m.role === 'coach');

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Team Roster</h1>
            <p className="text-muted-foreground">
              Manage your team members and athletes
            </p>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
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

        {/* Coaches section */}
        {(coaches.length > 0 || isLoading) && (
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
                coaches.map((member) => (
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
            Athletes ({isLoading ? '...' : athletes.length})
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
          ) : athletes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center mb-4">
                  No athletes on your team yet
                </p>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Athletes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {athletes.map((member) => (
                <Card key={member.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(member.profiles.first_name, member.profiles.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {member.profiles.first_name} {member.profiles.last_name}
                          </h3>
                        </div>
                        
                        {member.profiles.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.profiles.email}
                          </p>
                        )}
                      </div>

                      <Link to={`/athletes/${member.profile_id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {!isLoading && filteredMembers.length === 0 && searchQuery && (
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
