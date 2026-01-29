import { Users, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  totalAthletes: number;
  workoutsCompleted: number;
  weeklyMiles: number;
  isLoading?: boolean;
}

export function QuickStats({ totalAthletes, workoutsCompleted, weeklyMiles, isLoading }: QuickStatsProps) {
  const stats = [
    {
      label: 'Athletes',
      value: totalAthletes,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Completed Today',
      value: workoutsCompleted,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Team Miles (Week)',
      value: weeklyMiles,
      icon: TrendingUp,
      color: 'text-info',
      bg: 'bg-info/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn(stat.bg, 'rounded-lg p-3')}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
