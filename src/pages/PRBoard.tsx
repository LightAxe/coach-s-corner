import { useState } from 'react';
import { Trophy, Medal, Calendar, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { usePRLeaderboard, useDistancesWithPRs } from '@/hooks/usePRs';
import { formatTime, getDistanceLabel } from '@/lib/types';
import { AddPRDialog } from '@/components/prs/AddPRDialog';

export default function PRBoard() {
  const { isCoach, currentTeam } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'prs' | 'srs'>('prs');
  const [addPROpen, setAddPROpen] = useState(false);
  
  // Fetch distances that have PRs recorded
  const { data: distancesWithPRs = [], isLoading: distancesLoading } = useDistancesWithPRs(
    currentTeam?.id,
    viewMode === 'srs' ? activeSeason?.id : undefined
  );
  
  // Auto-select first distance when data loads
  const activeDistance = selectedDistance || distancesWithPRs[0] || null;
  
  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading: leaderboardLoading } = usePRLeaderboard(
    currentTeam?.id,
    activeDistance || '',
    viewMode === 'srs' ? activeSeason?.id : undefined
  );
  
  const isLoading = distancesLoading || leaderboardLoading;
  
  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  };

  const getAthleteName = (pr: typeof leaderboard[0]) => {
    if (pr.profiles) {
      return `${pr.profiles.first_name} ${pr.profiles.last_name}`;
    }
    if (pr.team_athletes) {
      return `${pr.team_athletes.first_name} ${pr.team_athletes.last_name}`;
    }
    return 'Unknown';
  };

  const getAthleteInitials = (pr: typeof leaderboard[0]) => {
    if (pr.profiles) {
      return getInitials(pr.profiles.first_name, pr.profiles.last_name);
    }
    if (pr.team_athletes) {
      return getInitials(pr.team_athletes.first_name, pr.team_athletes.last_name);
    }
    return '??';
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-amber-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-700';
    return 'text-muted-foreground';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">PR Board</h1>
            <p className="text-muted-foreground">
              {viewMode === 'prs' ? 'All-time personal records' : `Season records for ${activeSeason?.name || 'current season'}`}
            </p>
          </div>
          <Button className="gap-2" onClick={() => setAddPROpen(true)}>
            <Plus className="h-4 w-4" />
            Add PR
          </Button>
        </div>

        {/* View mode toggle */}
        <Tabs value={viewMode} onValueChange={(v) => {
          setViewMode(v as 'prs' | 'srs');
          setSelectedDistance(null); // Reset selection when switching modes
        }}>
          <TabsList>
            <TabsTrigger value="prs">Personal Records (All-Time)</TabsTrigger>
            <TabsTrigger value="srs" disabled={!activeSeason}>
              Season Records {activeSeason ? `(${activeSeason.name})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Distance selector - only show distances with PRs */}
        {distancesWithPRs.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 flex-wrap">
                {distancesWithPRs.map((distance) => (
                  <Button
                    key={distance}
                    variant={activeDistance === distance ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDistance(distance)}
                  >
                    {getDistanceLabel(distance)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              {activeDistance ? `${getDistanceLabel(activeDistance)} Leaderboard` : 'Leaderboard'}
              {viewMode === 'srs' && activeSeason && (
                <Badge variant="secondary" className="ml-2">
                  {activeSeason.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : distancesWithPRs.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No {viewMode === 'prs' ? 'personal records' : 'season records'} recorded yet
                </p>
                <Button variant="outline" onClick={() => setAddPROpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First PR
                </Button>
              </div>
            ) : leaderboard.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((pr, index) => (
                    <TableRow key={pr.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index < 3 ? (
                            <Medal className={cn('h-5 w-5', getMedalColor(index))} />
                          ) : (
                            <span className="text-muted-foreground font-medium w-5 text-center">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getAthleteInitials(pr)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{getAthleteName(pr)}</p>
                            {!pr.profiles && pr.team_athletes && (
                              <Badge variant="outline" className="text-xs">
                                Not in app
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-lg">
                          {formatTime(pr.time_seconds)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(pr.achieved_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No records for {getDistanceLabel(activeDistance || '')} yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AddPRDialog 
        open={addPROpen} 
        onOpenChange={setAddPROpen}
        teamId={currentTeam?.id}
        seasonId={activeSeason?.id}
      />
    </AppLayout>
  );
}
