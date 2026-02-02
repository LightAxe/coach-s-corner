import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TeamAthleteStatsMap } from '@/hooks/useTeamAthleteStats';

interface AthleteStatsInlineProps {
  athleteId: string;
  stats: TeamAthleteStatsMap | undefined;
  isLoading: boolean;
}

const ZONE_COLORS: Record<string, string> = {
  insufficient: 'text-muted-foreground',
  undertraining: 'text-blue-600 dark:text-blue-400',
  optimal: 'text-green-600 dark:text-green-400',
  caution: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
};

const ZONE_LABELS: Record<string, string> = {
  insufficient: 'Need more data',
  undertraining: 'Undertraining',
  optimal: 'Optimal',
  caution: 'Caution',
  danger: 'High Risk',
  critical: 'Critical',
};

export function AthleteStatsInline({ athleteId, stats, isLoading }: AthleteStatsInlineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    );
  }

  const athleteStats = stats?.[athleteId];
  if (!athleteStats) {
    return (
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>—</span>
      </div>
    );
  }

  const { weeklyMiles, acwr, zone } = athleteStats;

  return (
    <div className="flex items-center gap-4 text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground whitespace-nowrap">
            {weeklyMiles > 0 ? `${weeklyMiles} mi/wk` : '0 mi'}
          </span>
        </TooltipTrigger>
        <TooltipContent>Miles in the last 7 days</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('font-medium whitespace-nowrap', ZONE_COLORS[zone])}>
            {acwr !== null ? acwr.toFixed(2) : '—'}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">ACWR: {ZONE_LABELS[zone]}</p>
          <p className="text-xs text-muted-foreground">
            {zone === 'insufficient'
              ? 'Need 7+ days of logs'
              : 'Acute:Chronic Workload Ratio'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
