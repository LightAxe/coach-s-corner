import { Trophy, MapPin, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RaceWithDistance } from '@/lib/types';

interface RaceCardProps {
  race: RaceWithDistance;
  compact?: boolean;
  onViewResults?: () => void;
}

export function RaceCard({ race, compact = false, onViewResults }: RaceCardProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <Badge className="bg-accent text-accent-foreground gap-1">
          <Trophy className="h-3 w-3" />
          Race
        </Badge>
        <h3 className="font-medium text-sm">{race.name}</h3>
        {race.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {race.location}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Badge className="bg-accent text-accent-foreground gap-1">
            <Trophy className="h-3 w-3" />
            Race
          </Badge>
          <h3 className="font-semibold">{race.name}</h3>
        </div>
      </div>

      {race.location && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {race.location}
        </p>
      )}

      {race.details && (
        <p className="text-sm text-muted-foreground">{race.details}</p>
      )}

      {race.transportation_info && (
        <div className="text-sm">
          <span className="font-medium">Transportation:</span>{' '}
          <span className="text-muted-foreground">{race.transportation_info}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {race.map_link && (
          <Button variant="outline" size="sm" asChild>
            <a href={race.map_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Course Map
            </a>
          </Button>
        )}
        {race.results_link && (
          <Button variant="outline" size="sm" asChild>
            <a href={race.results_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Results
            </a>
          </Button>
        )}
        {onViewResults && (
          <Button variant="default" size="sm" onClick={onViewResults}>
            Enter Results
          </Button>
        )}
      </div>
    </div>
  );
}
