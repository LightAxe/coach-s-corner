import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle, Activity, Ruler } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CompletionStatus, WorkoutType } from '@/lib/types';
import { getWorkoutTypeBadgeClass } from '@/lib/types';

interface WorkoutData {
  id: string;
  title: string;
  type: WorkoutType;
  description: string | null;
  scheduled_date: string;
}

interface JournalEntryProps {
  log: {
    id: string;
    completion_status: CompletionStatus | null;
    effort_level: number | null;
    how_felt: string | null;
    distance_value: number | null;
    distance_unit: string | null;
    notes: string | null;
    created_at: string;
    scheduled_workouts: WorkoutData | null;
  };
}

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  great: { label: 'Great', emoji: '💪' },
  strong: { label: 'Strong', emoji: '😊' },
  average: { label: 'Average', emoji: '😐' },
  tired: { label: 'Tired', emoji: '😓' },
  weak: { label: 'Weak', emoji: '😫' },
};

function getCompletionIcon(status: CompletionStatus | null) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'partial':
      return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    case 'none':
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getCompletionLabel(status: CompletionStatus | null) {
  switch (status) {
    case 'complete':
      return 'Completed';
    case 'partial':
      return 'Partial';
    case 'none':
      return 'Did Not Complete';
    default:
      return 'Unknown';
  }
}

export function JournalEntry({ log }: JournalEntryProps) {
  const workout = log.scheduled_workouts;
  if (!workout) return null;

  const feelingData = log.how_felt ? FEELING_LABELS[log.how_felt] : null;
  const isCustomFeeling = log.how_felt && !FEELING_LABELS[log.how_felt];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Completion indicator */}
          <div className="flex-shrink-0 pt-1">
            {getCompletionIcon(log.completion_status)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium truncate">{workout.title}</h3>
                <Badge 
                  variant="outline" 
                  className={cn('text-xs capitalize flex-shrink-0', getWorkoutTypeBadgeClass(workout.type))}
                >
                  {workout.type}
                </Badge>
              </div>
              <time className="text-sm text-muted-foreground flex-shrink-0">
                {format(new Date(workout.scheduled_date), 'MMM d, yyyy')}
              </time>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                {getCompletionLabel(log.completion_status)}
              </span>
              
              {log.effort_level && (
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  RPE: {log.effort_level}/10
                </span>
              )}
              
              {log.distance_value && (
                <span className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  {log.distance_value} {log.distance_unit || 'miles'}
                </span>
              )}
              
              {feelingData && (
                <span>
                  {feelingData.emoji} {feelingData.label}
                </span>
              )}
              
              {isCustomFeeling && (
                <span className="italic">"{log.how_felt}"</span>
              )}
            </div>

            {/* Notes */}
            {log.notes && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 mt-2">
                {log.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
