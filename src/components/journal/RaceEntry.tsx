import { format, parseISO } from 'date-fns';
import { Trophy, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTime, type RaceResultWithRelations } from '@/lib/types';

interface RaceEntryProps {
  result: RaceResultWithRelations;
}

export function RaceEntry({ result }: RaceEntryProps) {
  const race = result.races;
  const distance = result.distances || race?.distances;
  const raceDate = race?.race_date || result.achieved_at;

  return (
    <Card className="transition-shadow hover:shadow-md border-l-2 border-l-accent">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Trophy indicator */}
          <div className="flex-shrink-0 pt-1">
            <Trophy className="h-5 w-5 text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium truncate">
                  {race?.name || 'Offseason Result'}
                </h3>
                {distance && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {distance.name}
                  </Badge>
                )}
              </div>
              {raceDate && (
                <time className="text-sm text-muted-foreground flex-shrink-0">
                  {format(parseISO(raceDate), 'MMM d, yyyy')}
                </time>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-mono font-medium text-primary">
                {formatTime(result.time_seconds)}
              </span>
              
              {result.place && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Medal className="h-4 w-4" />
                  {result.place}{getOrdinalSuffix(result.place)} place
                </span>
              )}
              
              {race?.location && (
                <span className="text-muted-foreground">
                  {race.location}
                </span>
              )}
            </div>

            {/* Notes */}
            {result.notes && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
                {result.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
