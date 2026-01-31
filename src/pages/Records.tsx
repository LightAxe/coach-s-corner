import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Calendar, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonalRecords, useSeasonRecords } from '@/hooks/useRecords';
import { useDistances } from '@/hooks/useDistances';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useActiveSeason } from '@/hooks/useSeasons';
import { formatTime } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { AddOffseasonResultDialog } from '@/components/records/AddOffseasonResultDialog';

export default function Records() {
  const { currentTeam, isCoach } = useAuth();
  const teamId = currentTeam?.id;
  const { data: activeSeason } = useActiveSeason(teamId);
  const seasonId = activeSeason?.id;
  
  const { data: prRecords = [], isLoading: loadingPRs } = usePersonalRecords(teamId);
  const { data: srRecords = [], isLoading: loadingSRs } = useSeasonRecords(teamId, seasonId);
  const { data: distances = [] } = useDistances();
  const { data: athletes = [] } = useTeamAthletes(teamId, seasonId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Group records by distance
  const groupByDistance = (records: typeof prRecords) => {
    const grouped: Record<string, typeof prRecords> = {};
    for (const record of records) {
      if (!grouped[record.distance_id]) {
        grouped[record.distance_id] = [];
      }
      grouped[record.distance_id].push(record);
    }
    // Sort each group by time
    for (const distanceId of Object.keys(grouped)) {
      grouped[distanceId].sort((a, b) => a.best_time - b.best_time);
    }
    return grouped;
  };

  const prsByDistance = groupByDistance(prRecords);
  const srsByDistance = groupByDistance(srRecords);

  // Get athlete name by ID
  const getAthleteName = (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId);
    return athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Unknown';
  };

  // Check if a record is also the all-time PR
  const isPR = (athleteId: string, distanceId: string, time: number) => {
    const pr = prRecords.find(r => r.team_athlete_id === athleteId && r.distance_id === distanceId);
    return pr && pr.best_time === time;
  };

  const RecordsList = ({ 
    records, 
    showPRBadge = false 
  }: { 
    records: Record<string, typeof prRecords>;
    showPRBadge?: boolean;
  }) => {
    const sortedDistances = distances.filter(d => records[d.id]);

    if (sortedDistances.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              No records yet. Add race results to see records here.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {sortedDistances.map(distance => (
          <Card key={distance.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                {distance.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {records[distance.id].map((record, index) => (
                  <div 
                    key={`${record.team_athlete_id}-${record.distance_id}`}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div>
                        <span className="font-medium">
                          {getAthleteName(record.team_athlete_id)}
                        </span>
                        {showPRBadge && isPR(record.team_athlete_id, record.distance_id, record.best_time) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            PR
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">
                        {formatTime(record.best_time)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(record.achieved_at), 'MMM d, yyyy')}
                        {record.race_name && (
                          <span className="ml-1">• {record.race_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Records
            </h1>
            <p className="text-muted-foreground">Personal and season records for your team</p>
          </div>
          {isCoach && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Result
            </Button>
          )}
        </div>

        <Tabs defaultValue="prs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="prs" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Personal Records
            </TabsTrigger>
            <TabsTrigger value="srs" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Season Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prs">
            {loadingPRs ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Loading records...</p>
                </CardContent>
              </Card>
            ) : (
              <RecordsList records={prsByDistance} />
            )}
          </TabsContent>

          <TabsContent value="srs">
            {loadingSRs ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Loading records...</p>
                </CardContent>
              </Card>
            ) : (
              <RecordsList records={srsByDistance} showPRBadge />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddOffseasonResultDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />
    </AppLayout>
  );
}
