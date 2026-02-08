import { useState } from 'react';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { History, ChevronDown, ChevronRight, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLogs, type AuditLogEntry } from '@/hooks/useAuditLogs';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/PaginationControls';

const TABLE_LABELS: Record<string, string> = {
  team_athletes: 'Athlete',
  scheduled_workouts: 'Workout',
  races: 'Race',
  race_results: 'Race Result',
  workout_logs: 'Workout Log',
  announcements: 'Announcement',
  seasons: 'Season',
  parent_athlete_links: 'Parent Link',
};

const ACTION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Plus }> = {
  INSERT: { label: 'Created', variant: 'default', icon: Plus },
  UPDATE: { label: 'Updated', variant: 'secondary', icon: Pencil },
  DELETE: { label: 'Deleted', variant: 'destructive', icon: Trash2 },
};

function getRecordName(log: AuditLogEntry): string {
  const values = log.new_values || log.old_values;
  if (!values) return 'Unknown';
  
  // Try common name fields
  if (values.name) return String(values.name);
  if (values.title) return String(values.title);
  if (values.first_name && values.last_name) {
    return `${values.first_name} ${values.last_name}`;
  }
  if (values.first_name) return String(values.first_name);
  
  return log.record_id.slice(0, 8) + '...';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function AuditLogItem({ log }: { log: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = ACTION_CONFIG[log.action];
  const Icon = config.icon;
  
  const performerName = log.performer 
    ? `${log.performer.first_name} ${log.performer.last_name}`
    : 'System';

  // For updates, show what changed
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  if (log.action === 'UPDATE' && log.old_values && log.new_values) {
    for (const key of Object.keys(log.new_values)) {
      if (key === 'updated_at' || key === 'created_at') continue;
      const oldVal = log.old_values[key];
      const newVal = log.new_values[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, from: oldVal, to: newVal });
      }
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors text-left">
          <div className="flex-shrink-0">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
              <span className="font-medium truncate">
                {TABLE_LABELS[log.table_name] || log.table_name}
              </span>
              <span className="text-muted-foreground truncate">
                "{getRecordName(log)}"
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span>{performerName}</span>
              <span>•</span>
              <span>{format(new Date(log.performed_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-12 mr-3 mb-3 p-3 bg-muted/30 rounded-lg text-sm space-y-2">
          {log.action === 'UPDATE' && changes.length > 0 && (
            <div>
              <p className="font-medium mb-2">Changes:</p>
              <div className="space-y-1">
                {changes.map(({ field, from, to }) => (
                  <div key={field} className="flex flex-wrap gap-1">
                    <span className="font-mono text-xs bg-muted px-1 rounded">{field}</span>
                    <span className="text-muted-foreground">from</span>
                    <span className="text-destructive line-through">{formatValue(from)}</span>
                    <span className="text-muted-foreground">to</span>
                    <span className="text-primary">{formatValue(to)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {log.action === 'DELETE' && log.old_values && (
            <div>
              <p className="font-medium mb-2">Deleted data:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}
          
          {log.action === 'INSERT' && log.new_values && (
            <div>
              <p className="font-medium mb-2">Created with:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AuditLogPage() {
  const { isCoach } = useAuth();
  const { data: logs = [], isLoading } = useAuditLogs(500);
  const {
    paginatedItems: paginatedLogs,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    startIndex,
    endIndex,
  } = usePagination(logs, { pageSize: 25 });

  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Track changes made to your team's data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              {totalItems > 0
                ? `${totalItems} changes to athletes, workouts, races, and more`
                : 'Changes to athletes, workouts, races, and more'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : totalItems > 0 ? (
              <>
                <div className="divide-y">
                  {paginatedLogs.map((log) => (
                    <AuditLogItem key={log.id} log={log} />
                  ))}
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  className="mt-6"
                />
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No activity recorded yet</p>
                <p className="text-sm">Changes to team data will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
