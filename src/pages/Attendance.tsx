import { useState, useMemo, useCallback } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { useAttendanceByDate, useUpsertAttendance, useBulkUpsertAttendance } from '@/hooks/useAttendance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AttendanceStatus, TeamAthleteWithProfile, Attendance } from '@/lib/types';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; color: string }> = {
  present: { label: 'Present', short: 'P', color: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' },
  absent: { label: 'Absent', short: 'A', color: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' },
  excused: { label: 'Excused', short: 'E', color: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200' },
  late: { label: 'Late', short: 'L', color: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200' },
};

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'excused', 'late'];

function getAthleteName(athlete: TeamAthleteWithProfile): string {
  if (athlete.profiles?.first_name || athlete.profiles?.last_name) {
    return `${athlete.profiles.first_name || ''} ${athlete.profiles.last_name || ''}`.trim();
  }
  return `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Unknown';
}

function getAthleteInitials(athlete: TeamAthleteWithProfile): string {
  const name = getAthleteName(athlete);
  const parts = name.split(' ');
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { currentTeam, isCoach, user } = useAuth();
  const { data: activeSeason } = useActiveSeason(currentTeam?.id);
  const { data: athletes = [], isLoading: athletesLoading } = useTeamAthletes(
    currentTeam?.id,
    activeSeason?.id
  );

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceByDate(
    currentTeam?.id,
    dateStr
  );

  const upsertAttendance = useUpsertAttendance();
  const bulkUpsert = useBulkUpsertAttendance();

  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  const isLoading = athletesLoading || attendanceLoading;

  // Map attendance records by team_athlete_id for quick lookup
  const attendanceMap = useMemo(() => {
    const map: Record<string, Attendance> = {};
    for (const record of attendanceRecords) {
      map[record.team_athlete_id] = record;
    }
    return map;
  }, [attendanceRecords]);

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, excused: 0, late: 0 };
    const recorded = new Set(attendanceRecords.map(r => r.team_athlete_id));
    for (const athlete of athletes) {
      const record = attendanceMap[athlete.id];
      if (record) {
        counts[record.status]++;
      }
    }
    return { counts, recorded: recorded.size, total: athletes.length };
  }, [athletes, attendanceRecords, attendanceMap]);

  const handleStatusChange = useCallback((athleteId: string, status: AttendanceStatus) => {
    if (!currentTeam?.id || !user?.id) return;
    const note = notes[athleteId] || attendanceMap[athleteId]?.note || null;
    upsertAttendance.mutate({
      team_id: currentTeam.id,
      team_athlete_id: athleteId,
      date: dateStr,
      status,
      note,
      created_by: user.id,
    });
  }, [currentTeam?.id, user?.id, dateStr, notes, attendanceMap, upsertAttendance]);

  const handleNoteBlur = useCallback((athleteId: string) => {
    const existingRecord = attendanceMap[athleteId];
    if (!existingRecord || !currentTeam?.id || !user?.id) return;
    const newNote = notes[athleteId] ?? null;
    if (newNote === (existingRecord.note ?? '')) return;
    upsertAttendance.mutate({
      team_id: currentTeam.id,
      team_athlete_id: athleteId,
      date: dateStr,
      status: existingRecord.status,
      note: newNote || null,
      created_by: user.id,
    });
  }, [attendanceMap, currentTeam?.id, user?.id, dateStr, notes, upsertAttendance]);

  const handleMarkAllPresent = () => {
    if (!currentTeam?.id || !user?.id) return;
    const records = athletes.map(a => ({
      team_id: currentTeam.id,
      team_athlete_id: a.id,
      date: dateStr,
      status: 'present' as AttendanceStatus,
      note: attendanceMap[a.id]?.note || null,
      created_by: user.id,
    }));
    bulkUpsert.mutate(records, {
      onSuccess: () => toast.success('All athletes marked present'),
    });
  };

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Attendance</h1>
            <p className="text-muted-foreground">Track daily practice attendance</p>
          </div>
          <Button
            className="gap-2"
            onClick={handleMarkAllPresent}
            disabled={bulkUpsert.isPending || athletes.length === 0}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark All Present
          </Button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            )}
          </div>
          <h2 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            {isToday && <Badge variant="default" className="ml-2 text-xs">Today</Badge>}
          </h2>
        </div>

        {/* Summary bar */}
        {!isLoading && athletes.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {STATUSES.map(status => (
              <div key={status} className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn('text-xs', STATUS_CONFIG[status].color)}>
                  {summary.counts[status]}
                </Badge>
                <span className="text-sm text-muted-foreground">{STATUS_CONFIG[status].label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {summary.recorded}/{summary.total} recorded
              </span>
            </div>
          </div>
        )}

        {/* Athlete roster */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Roster</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <div className="ml-auto flex gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : athletes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No athletes on the roster for this season.
              </p>
            ) : (
              <div className="space-y-2">
                {athletes
                  .sort((a, b) => {
                    const nameA = getAthleteName(a).toLowerCase();
                    const nameB = getAthleteName(b).toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map(athlete => {
                    const record = attendanceMap[athlete.id];
                    const currentStatus = record?.status;
                    const noteValue = notes[athlete.id] ?? record?.note ?? '';

                    return (
                      <div
                        key={athlete.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border bg-card"
                      >
                        {/* Name */}
                        <div className="flex items-center gap-3 min-w-0 sm:w-48">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                            {getAthleteInitials(athlete)}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {getAthleteName(athlete)}
                          </span>
                        </div>

                        {/* Status buttons */}
                        <div className="flex gap-1 shrink-0">
                          {STATUSES.map(status => (
                            <Button
                              key={status}
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-8 w-8 p-0 text-xs font-semibold',
                                currentStatus === status
                                  ? STATUS_CONFIG[status].color
                                  : 'text-muted-foreground'
                              )}
                              onClick={() => handleStatusChange(athlete.id, status)}
                              disabled={upsertAttendance.isPending}
                            >
                              {STATUS_CONFIG[status].short}
                            </Button>
                          ))}
                        </div>

                        {/* Note */}
                        <Input
                          placeholder="Note (optional)"
                          value={noteValue}
                          onChange={e => setNotes(prev => ({ ...prev, [athlete.id]: e.target.value }))}
                          onBlur={() => handleNoteBlur(athlete.id)}
                          className="text-sm h-8 sm:flex-1"
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
