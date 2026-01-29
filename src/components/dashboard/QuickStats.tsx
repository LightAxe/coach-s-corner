import { Users, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickStatsProps {
  totalAthletes: number;
  workoutsCompleted: number;
  weeklyMiles: number;
}

export function QuickStats({ totalAthletes, workoutsCompleted, weeklyMiles }: QuickStatsProps) {
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
