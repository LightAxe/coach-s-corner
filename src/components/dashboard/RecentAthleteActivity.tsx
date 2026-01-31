import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Trophy, CheckCircle, Circle, CircleDot } from 'lucide-react';
import { formatTime, type CompletionStatus } from '@/lib/types';

interface AthleteActivity {
  id: string;
  type: 'workout' | 'race';
  athleteName: string;
  title: string;
  date: string;
  details?: string;
}

interface RecentAthleteActivityProps {
  activities: AthleteActivity[];
  isLoading: boolean;
}

function getCompletionIcon(status: CompletionStatus | null) {
  switch (status) {
    case 'complete':
      return <CheckCircle className="h-3 w-3 text-primary" />;
    case 'partial':
      return <CircleDot className="h-3 w-3 text-accent" />;
    default:
      return <Circle className="h-3 w-3 text-muted-foreground" />;
  }
}

export function RecentAthleteActivity({ activities, isLoading }: RecentAthleteActivityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Athlete Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Recent Athlete Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity yet
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div 
                key={`${activity.type}-${activity.id}`}
                className="flex items-start gap-3 py-2 border-b last:border-0"
              >
                <div className="mt-0.5">
                  {activity.type === 'race' ? (
                    <Trophy className="h-4 w-4 text-accent" />
                  ) : (
                    <Activity className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {activity.athleteName}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {activity.type === 'race' ? 'Race' : 'Workout'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.title}
                    {activity.details && ` • ${activity.details}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
