import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle, Activity, Ruler, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    // Personal workout fields
    workout_date?: string | null;
    workout_type?: WorkoutType | null;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  great: { label: 'Great', emoji: '💪' },
  strong: { label: 'Strong', emoji: '😊' },
  average: { label: 'Average', emoji: '😐' },
  tired: { label: 'Tired', emoji: '😓' },
  weak: { label: 'Weak', emoji: '😫' },
};

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  easy: 'Easy Run',
  tempo: 'Tempo',
  interval: 'Interval',
  long: 'Long Run',
  rest: 'Rest',
  race: 'Race',
  other: 'Other',
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

export function JournalEntry({ log, onEdit, onDelete }: JournalEntryProps) {
  const workout = log.scheduled_workouts;
  const isPersonal = !workout;

  // For personal workouts, derive title/type/date from the log itself
  const title = workout?.title || (log.workout_type ? WORKOUT_TYPE_LABELS[log.workout_type] || 'Workout' : 'Personal Workout');
  const type = workout?.type || log.workout_type;
  const dateStr = workout?.scheduled_date || log.workout_date;

  if (!dateStr) return null;

  const feelingData = log.how_felt ? FEELING_LABELS[log.how_felt] : null;
  const isCustomFeeling = log.how_felt && !FEELING_LABELS[log.how_felt];

  return (
    <Card className={cn('transition-shadow hover:shadow-md', isPersonal && 'border-l-2 border-l-primary/40')}>
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
                <h3 className="font-medium truncate">{title}</h3>
                {type && (
                  <Badge
                    variant="outline"
                    className={cn('text-xs capitalize flex-shrink-0', getWorkoutTypeBadgeClass(type))}
                  >
                    {type}
                  </Badge>
                )}
                {isPersonal && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Personal
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isPersonal && onEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isPersonal && onDelete && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <time className="text-sm text-muted-foreground">
                  {format(new Date(dateStr), 'MMM d, yyyy')}
                </time>
              </div>
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
