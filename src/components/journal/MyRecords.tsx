import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Trophy, ChevronDown, Medal, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatTime, type RaceResultWithRelations } from '@/lib/types';

interface MyRecordsProps {
  raceResults: RaceResultWithRelations[];
}

interface DistanceGroup {
  distanceId: string;
  distanceName: string;
  results: {
    result: RaceResultWithRelations;
    date: string;
    wasPR: boolean;
  }[];
  currentPR: number;
  prDate: string;
}

export function MyRecords({ raceResults }: MyRecordsProps) {
  const distanceGroups = useMemo(() => {
    // Group results by distance
    const grouped = new Map<string, { distanceName: string; results: RaceResultWithRelations[] }>();

    for (const result of raceResults) {
      const distance = result.distances || result.races?.distances;
      if (!distance) continue;

      const existing = grouped.get(distance.id);
      if (existing) {
        existing.results.push(result);
      } else {
        grouped.set(distance.id, {
          distanceName: distance.name,
          results: [result],
        });
      }
    }

    // Process each group: sort chronologically and compute running PR
    const groups: DistanceGroup[] = [];

    for (const [distanceId, { distanceName, results }] of grouped) {
      // Sort chronologically (oldest first)
      const sorted = [...results].sort((a, b) => {
        const dateA = a.races?.race_date || a.achieved_at || '';
        const dateB = b.races?.race_date || b.achieved_at || '';
        return dateA.localeCompare(dateB);
      });

      let runningMin = Infinity;
      const processedResults = sorted.map((result) => {
        const date = result.races?.race_date || result.achieved_at || '';
        const wasPR = result.time_seconds < runningMin;
        if (wasPR) {
          runningMin = result.time_seconds;
        }
        return { result, date, wasPR };
      });

      // Current PR is the overall best
      const best = processedResults.reduce(
        (min, r) => (r.result.time_seconds < min.time ? { time: r.result.time_seconds, date: r.date } : min),
        { time: Infinity, date: '' }
      );

      groups.push({
        distanceId,
        distanceName,
        results: processedResults,
        currentPR: best.time,
        prDate: best.date,
      });
    }

    // Sort groups by distance name
    groups.sort((a, b) => a.distanceName.localeCompare(b.distanceName));

    return groups;
  }, [raceResults]);

  if (distanceGroups.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        My Records
      </h3>
      {distanceGroups.map((group) => (
        <DistanceCard key={group.distanceId} group={group} />
      ))}
    </div>
  );
}

function DistanceCard({ group }: { group: DistanceGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-4 w-4 text-primary" />
                {group.distanceName}
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-mono font-semibold text-primary">
                    {formatTime(group.currentPR)}
                  </span>
                  {group.prDate && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(parseISO(group.prDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {group.results.length} result{group.results.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2 border-t pt-3">
              {group.results.map(({ result, date, wasPR }, index) => {
                const race = result.races;
                const improvement =
                  index > 0
                    ? result.time_seconds - group.results[index - 1].result.time_seconds
                    : null;

                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <time className="text-muted-foreground text-xs w-24 flex-shrink-0">
                        {date ? format(parseISO(date), 'MMM d, yyyy') : '—'}
                      </time>
                      <span className="truncate text-muted-foreground">
                        {race?.name || 'Offseason'}
                      </span>
                      {wasPR && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0 gap-1">
                          <TrendingDown className="h-3 w-3" />
                          PR
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono font-medium flex-shrink-0 ml-2">
                      {formatTime(result.time_seconds)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
