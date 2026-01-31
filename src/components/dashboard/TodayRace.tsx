import { useState } from 'react';
import { Trophy, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RaceDetailDialog } from '@/components/races/RaceDetailDialog';
import type { RaceWithDistance } from '@/lib/types';

interface TodayRaceProps {
  race?: RaceWithDistance | null;
  isLoading?: boolean;
}

export function TodayRace({ race, isLoading }: TodayRaceProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1 bg-accent" />
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!race) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden border-accent">
        <div className="h-1 bg-accent" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Trophy className="h-4 w-4 text-accent" />
                Today's Race
              </p>
              <CardTitle className="text-xl">{race.name}</CardTitle>
            </div>
            <Badge variant="outline" className="border-accent text-accent">
              Race Day
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {race.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{race.location}</span>
            </div>
          )}
          
          {race.distances && (
            <Badge variant="secondary">{race.distances.name}</Badge>
          )}

          {race.details && (
            <p className="text-muted-foreground text-sm">{race.details}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
              View Details
            </Button>
            {race.map_link && (
              <Button variant="ghost" size="sm" asChild>
                <a href={race.map_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Map
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <RaceDetailDialog
        race={race}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
