import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { CalendarIcon, BookOpen, Trophy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useProfileRaceResults } from '@/hooks/useRaceResults';
import { JournalEntry } from '@/components/journal/JournalEntry';
import { RaceEntry } from '@/components/journal/RaceEntry';

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time', days: null },
];

export default function TrainingJournal() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activePreset, setActivePreset] = useState<number | null>(30);
  const [activeTab, setActiveTab] = useState<'workouts' | 'races'>('workouts');

  const { data: logs, isLoading: logsLoading } = useAthleteWorkoutLogs(user?.id);
  const { data: raceResults, isLoading: racesLoading } = useProfileRaceResults(user?.id);

  const isLoading = activeTab === 'workouts' ? logsLoading : racesLoading;

  // Filter workout logs by date range
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    if (!dateRange.from && !dateRange.to) {
      return logs;
    }

    return logs.filter((log) => {
      const workoutDate = log.scheduled_workouts?.scheduled_date;
      if (!workoutDate) return false;

      const date = parseISO(workoutDate);
      
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(date, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      
      if (dateRange.from) {
        return date >= startOfDay(dateRange.from);
      }
      
      if (dateRange.to) {
        return date <= endOfDay(dateRange.to);
      }
      
      return true;
    });
  }, [logs, dateRange]);

  // Filter race results by date range
  const filteredRaces = useMemo(() => {
    if (!raceResults) return [];
    
    if (!dateRange.from && !dateRange.to) {
      return raceResults;
    }

    return raceResults.filter((result) => {
      const raceDate = result.races?.race_date || result.achieved_at;
      if (!raceDate) return false;

      const date = parseISO(raceDate);
      
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(date, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      
      if (dateRange.from) {
        return date >= startOfDay(dateRange.from);
      }
      
      if (dateRange.to) {
        return date <= endOfDay(dateRange.to);
      }
      
      return true;
    });
  }, [raceResults, dateRange]);

  const handlePresetClick = (days: number | null) => {
    setActivePreset(days);
    if (days === null) {
      setDateRange({ from: undefined, to: undefined });
    } else {
      setDateRange({
        from: subDays(new Date(), days),
        to: new Date(),
      });
    }
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      setActivePreset(null);
    }
  };

  // Group logs by month for timeline
  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof filteredLogs> = {};
    
    filteredLogs.forEach((log) => {
      const workoutDate = log.scheduled_workouts?.scheduled_date;
      if (!workoutDate) return;
      
      const monthKey = format(parseISO(workoutDate), 'MMMM yyyy');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(log);
    });

    return groups;
  }, [filteredLogs]);

  // Group races by month for timeline
  const groupedRaces = useMemo(() => {
    const groups: Record<string, typeof filteredRaces> = {};
    
    filteredRaces.forEach((result) => {
      const raceDate = result.races?.race_date || result.achieved_at;
      if (!raceDate) return;
      
      const monthKey = format(parseISO(raceDate), 'MMMM yyyy');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(result);
    });

    return groups;
  }, [filteredRaces]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Training Journal
            </h1>
            <p className="text-muted-foreground mt-1">
              Your personal training history and progress
            </p>
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  'All time'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="flex flex-wrap gap-2">
                  {PRESET_RANGES.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={activePreset === preset.days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePresetClick(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={handleCustomDateChange}
                numberOfMonths={2}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Tabs for Workouts and Races */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'workouts' | 'races')}>
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="workouts" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Workouts ({filteredLogs.length})
            </TabsTrigger>
            <TabsTrigger value="races" className="gap-2">
              <Trophy className="h-4 w-4" />
              Races ({filteredRaces.length})
            </TabsTrigger>
          </TabsList>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="mt-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{filteredLogs.length}</div>
                  <p className="text-xs text-muted-foreground">Workouts Logged</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {filteredLogs.filter((l) => l.completion_status === 'complete').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {filteredLogs.reduce((sum, l) => sum + (l.distance_value || 0), 0).toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Miles</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {filteredLogs.length > 0 && filteredLogs.filter((l) => l.effort_level).length > 0
                      ? (
                          filteredLogs.reduce((sum, l) => sum + (l.effort_level || 0), 0) /
                          filteredLogs.filter((l) => l.effort_level).length
                        ).toFixed(1)
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg RPE</p>
                </CardContent>
              </Card>
            </div>

            {/* Workouts Timeline */}
            {logsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No workout logs yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Start logging your workouts from the Dashboard or Calendar to build your training history.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedLogs).map(([month, monthLogs]) => (
                  <div key={month}>
                    <h2 className="text-lg font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                      {month}
                    </h2>
                    <div className="space-y-3">
                      {monthLogs.map((log) => (
                        <JournalEntry key={log.id} log={log as any} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Races Tab */}
          <TabsContent value="races" className="mt-6">
            {/* Race Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{filteredRaces.length}</div>
                  <p className="text-xs text-muted-foreground">Race Results</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {filteredRaces.filter((r) => r.place && r.place <= 10).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Top 10 Finishes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {filteredRaces.filter((r) => r.place === 1).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </CardContent>
              </Card>
            </div>

            {/* Races Timeline */}
            {racesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredRaces.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No race results yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Your race results will appear here once your coach enters them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedRaces).map(([month, monthRaces]) => (
                  <div key={month}>
                    <h2 className="text-lg font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                      {month}
                    </h2>
                    <div className="space-y-3">
                      {monthRaces.map((result) => (
                        <RaceEntry key={result.id} result={result} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
