import { useState } from 'react';
import { Plus, Search, Trophy, ChevronRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { athletes, raceDistances } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function Athletes() {
  const { isCoach } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  
  // Redirect non-coaches
  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'all' || athlete.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getPRForDistance = (athleteId: string, distanceId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    return athlete?.prs.find(pr => pr.distanceId === distanceId);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Athletes</h1>
            <p className="text-muted-foreground">
              Manage your team roster and track individual progress
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Athlete
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={genderFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('all')}
            >
              All
            </Button>
            <Button
              variant={genderFilter === 'M' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('M')}
            >
              Boys
            </Button>
            <Button
              variant={genderFilter === 'F' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenderFilter('F')}
            >
              Girls
            </Button>
          </div>
        </div>

        {/* Athletes list */}
        <div className="space-y-3">
          {filteredAthletes.map((athlete) => (
            <Card key={athlete.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(athlete.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{athlete.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        Grade {athlete.grade}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-xs',
                          athlete.gender === 'M' ? 'border-info/30 text-info' : 'border-accent/50 text-accent'
                        )}
                      >
                        {athlete.gender === 'M' ? 'Boys' : 'Girls'}
                      </Badge>
                    </div>
                    
                    {/* PRs inline */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {raceDistances.slice(0, 2).map((distance) => {
                        const pr = getPRForDistance(athlete.id, distance.id);
                        return (
                          <div key={distance.id} className="flex items-center gap-1.5">
                            <Trophy className="h-3.5 w-3.5 text-accent" />
                            <span className="text-muted-foreground">{distance.name}:</span>
                            <span className="font-medium">
                              {pr ? pr.time : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Link to={`/athletes/${athlete.id}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAthletes.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center mb-4">
                No athletes found
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setGenderFilter('all'); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
