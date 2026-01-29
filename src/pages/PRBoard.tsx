import { useState } from 'react';
import { Trophy, Medal, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { athletes, raceDistances, RaceDistance } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function PRBoard() {
  const { isCoach } = useAuth();
  const [selectedDistance, setSelectedDistance] = useState<RaceDistance>(raceDistances[1]); // 5K by default
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  
  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  // Get all athletes with PRs for selected distance
  const athletesWithPRs = athletes
    .filter(a => genderFilter === 'all' || a.gender === genderFilter)
    .map(athlete => {
      const pr = athlete.prs.find(p => p.distanceId === selectedDistance.id);
      return { ...athlete, pr };
    })
    .filter(a => a.pr)
    .sort((a, b) => {
      // Sort by time (convert MM:SS to seconds for comparison)
      const timeA = a.pr!.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1 - i), 0);
      const timeB = b.pr!.time.split(':').reduce((acc, t, i) => acc + parseInt(t) * Math.pow(60, 1 - i), 0);
      return timeA - timeB;
    });

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
              Personal records and team rankings
            </p>
          </div>
          <Button className="gap-2">
            <Trophy className="h-4 w-4" />
            Add PR
          </Button>
        </div>

        {/* Distance selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2 flex-wrap">
                {raceDistances.map((distance) => (
                  <Button
                    key={distance.id}
                    variant={selectedDistance.id === distance.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDistance(distance)}
                  >
                    {distance.name}
                  </Button>
                ))}
              </div>
              <div className="sm:ml-auto flex gap-2">
                <Button
                  variant={genderFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setGenderFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={genderFilter === 'M' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setGenderFilter('M')}
                >
                  Boys
                </Button>
                <Button
                  variant={genderFilter === 'F' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setGenderFilter('F')}
                >
                  Girls
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              {selectedDistance.name} Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {athletesWithPRs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="hidden sm:table-cell">Race</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletesWithPRs.map((athlete, index) => (
                    <TableRow key={athlete.id}>
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
                              {getInitials(athlete.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{athlete.name}</p>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-xs sm:hidden',
                                athlete.gender === 'M' ? 'border-info/30 text-info' : 'border-accent/50 text-accent'
                              )}
                            >
                              {athlete.gender === 'M' ? 'Boys' : 'Girls'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {athlete.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-lg">
                          {athlete.pr?.time}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {athlete.pr?.race || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {athlete.pr?.date ? format(parseISO(athlete.pr.date), 'MMM d, yyyy') : '—'}
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
                  No PRs recorded for {selectedDistance.name} yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
