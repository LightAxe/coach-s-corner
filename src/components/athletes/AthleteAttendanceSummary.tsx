import { useMemo } from 'react';
import { format, subDays, differenceInCalendarDays, parseISO, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAthleteAttendance } from '@/hooks/useAttendance';
import type { AttendanceStatus } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  excused: 'bg-yellow-500',
  late: 'bg-orange-500',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  excused: 'Excused',
  late: 'Late',
};

interface AthleteAttendanceSummaryProps {
  teamAthleteId: string;
}

export function AthleteAttendanceSummary({ teamAthleteId }: AthleteAttendanceSummaryProps) {
  const { data: records = [], isLoading } = useAthleteAttendance(teamAthleteId);

  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const total = records.length;
    const presentOrLate = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const rate = Math.round((presentOrLate / total) * 100);

    // Current streak: consecutive calendar days with present/late from most recent
    let streak = 0;
    let expectedDate: Date | null = null;
    for (const record of records) {
      const recordDate = parseISO(record.date);
      if (expectedDate && differenceInCalendarDays(expectedDate, recordDate) > 0) {
        break; // gap in dates
      }
      if (record.status === 'present' || record.status === 'late') {
        streak++;
        expectedDate = addDays(recordDate, -1);
      } else {
        break;
      }
    }

    // Last absence
    const lastAbsence = records.find(r => r.status === 'absent' || r.status === 'excused');

    return { total, rate, streak, lastAbsence: lastAbsence?.date ?? null };
  }, [records]);

  // Last 30 days strip
  const strip = useMemo(() => {
    const today = new Date();
    const recordMap = new Map<string, AttendanceStatus>();
    for (const r of records) {
      recordMap.set(r.date, r.status);
    }

    const days: { date: string; status: AttendanceStatus | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      days.push({ date: d, status: recordMap.get(d) ?? null });
    }
    return days;
  }, [records]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No attendance records yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold">{stats.rate}%</p>
            <p className="text-xs text-muted-foreground">Attendance rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Days recorded</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.lastAbsence
                ? `${differenceInCalendarDays(new Date(), parseISO(stats.lastAbsence))}d`
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Since last absence</p>
          </div>
        </div>

        {/* 30-day strip */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Last 30 days</p>
          <TooltipProvider delayDuration={100}>
            <div className="flex gap-0.5">
              {strip.map(day => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-4 flex-1 rounded-sm ${
                        day.status ? STATUS_COLORS[day.status] : 'bg-muted'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>{format(parseISO(day.date), 'MMM d')}</p>
                    <p>{day.status ? STATUS_LABELS[day.status] : 'No record'}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
