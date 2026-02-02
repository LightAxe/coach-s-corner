import { Info, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useACWR } from '@/hooks/useACWR';
import { cn } from '@/lib/utils';

interface ACWRIndicatorProps {
  teamAthleteId: string;
  compact?: boolean;
}

const ZONE_CONFIG = {
  insufficient: {
    label: 'Insufficient Data',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Need more workout logs to calculate ACWR',
  },
  undertraining: {
    label: 'Undertraining',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    description: 'Training load is low - fitness may decline',
  },
  optimal: {
    label: 'Optimal',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    description: 'Training load is in the sweet spot',
  },
  caution: {
    label: 'Caution',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    description: 'Training load is elevated - monitor closely',
  },
  danger: {
    label: 'High Risk',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    description: 'Training spike detected - injury risk elevated',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    description: 'Severe training spike - high injury risk',
  },
};

function MiniTrendChart({ data }: { data: { date: string; load: number }[] }) {
  if (data.length === 0) return null;

  const maxLoad = Math.max(...data.map(d => d.load), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="flex items-end h-8 gap-px">
      {data.map((day, i) => {
        const height = maxLoad > 0 ? (day.load / maxLoad) * 100 : 0;
        return (
          <div
            key={day.date}
            className="bg-primary/60 rounded-t-sm transition-all"
            style={{
              width: `${barWidth}%`,
              height: `${Math.max(height, 2)}%`,
            }}
            title={`${day.date}: ${day.load.toFixed(1)} AU`}
          />
        );
      })}
    </div>
  );
}

function getTrendIndicator(history: { date: string; acwr: number }[]) {
  if (history.length < 2) return null;

  const recent = history.slice(-3);
  if (recent.length < 2) return null;

  const first = recent[0].acwr;
  const last = recent[recent.length - 1].acwr;
  const diff = last - first;

  if (Math.abs(diff) < 0.05) {
    return { icon: Minus, label: 'Stable', color: 'text-muted-foreground' };
  } else if (diff > 0) {
    return { icon: TrendingUp, label: 'Increasing', color: 'text-orange-500' };
  } else {
    return { icon: TrendingDown, label: 'Decreasing', color: 'text-blue-500' };
  }
}

export function ACWRIndicator({ teamAthleteId, compact = false }: ACWRIndicatorProps) {
  const { data, isLoading } = useACWR(teamAthleteId);

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-16 w-full" />
    ) : (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const zone = ZONE_CONFIG[data.zone];
  const trend = getTrendIndicator(data.acwrHistory);

  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg', zone.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">ACWR</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">Acute:Chronic Workload Ratio</p>
                <p className="text-xs mt-1">
                  Compares recent training (7 days) to baseline (28 days).
                  Optimal range is 0.8-1.3.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {data.zone !== 'insufficient' && trend && (
            <trend.icon className={cn('h-4 w-4', trend.color)} />
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={cn('text-2xl font-bold', zone.color)}>
            {data.acwr !== null ? data.acwr.toFixed(2) : '—'}
          </span>
          <span className={cn('text-sm', zone.color)}>{zone.label}</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Training Load
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">ACWR (Acute:Chronic Workload Ratio)</p>
              <p className="text-xs mt-1">
                Calculated using RPE × Distance. Compares the last 7 days (acute)
                to the 28-day average (chronic) using exponentially weighted moving averages.
              </p>
              <div className="text-xs mt-2 space-y-1">
                <p><span className="text-blue-500">{"<"}0.8</span> Undertraining</p>
                <p><span className="text-green-500">0.8-1.3</span> Optimal</p>
                <p><span className="text-yellow-500">1.3-1.5</span> Caution</p>
                <p><span className="text-orange-500">1.5-2.0</span> High Risk</p>
                <p><span className="text-red-500">{">"}2.0</span> Critical</p>
              </div>
            </TooltipContent>
          </Tooltip>
          {data.zone === 'danger' || data.zone === 'critical' ? (
            <AlertTriangle className={cn('h-4 w-4 ml-auto', zone.color)} />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ACWR Value and Zone */}
        <div className={cn('p-4 rounded-lg', zone.bgColor)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">ACWR</span>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <trend.icon className={cn('h-3.5 w-3.5', trend.color)} />
                <span className={trend.color}>{trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <span className={cn('text-3xl font-bold', zone.color)}>
              {data.acwr !== null ? data.acwr.toFixed(2) : '—'}
            </span>
            <span className={cn('text-sm font-medium', zone.color)}>
              {zone.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{zone.description}</p>
        </div>

        {/* Load Details */}
        {data.zone !== 'insufficient' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Acute (7d)</p>
              <p className="font-medium">{data.acuteLoad} AU</p>
            </div>
            <div>
              <p className="text-muted-foreground">Chronic (28d avg)</p>
              <p className="font-medium">{data.chronicLoad} AU</p>
            </div>
          </div>
        )}

        {/* 14-day Load Trend */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Daily Load (14 days)</p>
          <MiniTrendChart data={data.trend} />
        </div>

        {/* Data Quality Indicator */}
        {data.daysWithData < 14 && (
          <p className="text-xs text-muted-foreground">
            Based on {data.daysWithData} days with logged workouts.
            {data.daysWithData < 7 && ' Need at least 7 days for ACWR.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
