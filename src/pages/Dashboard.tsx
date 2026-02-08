import { AppLayout } from '@/components/layout/AppLayout';
import { TodayWorkout } from '@/components/dashboard/TodayWorkout';
import { TodayRace } from '@/components/dashboard/TodayRace';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { WeekPreview } from '@/components/dashboard/WeekPreview';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { RecentAthleteActivity } from '@/components/dashboard/RecentAthleteActivity';
import { WorkoutCompliance } from '@/components/dashboard/WorkoutCompliance';
import { ParentDashboard } from '@/components/dashboard/ParentDashboard';
import { ParentAccessCard } from '@/components/dashboard/ParentAccessCard';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveSeason } from '@/hooks/useSeasons';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useTeamAthletes } from '@/hooks/useTeamAthletes';
import { 
  useTodayWorkout, 
  useTodayRace,
  useScheduledWorkouts, 
  useWeekRaces,
  useTeamStats,
  useRecentAthleteActivity
} from '@/hooks/useDashboardData';

function CoachAthleteDashboard() {
  const { currentTeam, isCoach, isAthlete } = useAuth();
  const teamId = currentTeam?.id;
  const { data: activeSeason } = useActiveSeason(teamId);

  const { data: todayWorkout, isLoading: todayLoading } = useTodayWorkout(teamId);
  const { data: todayRace, isLoading: raceLoading } = useTodayRace(teamId);
  const { data: weekWorkouts = [], isLoading: weekLoading } = useScheduledWorkouts(teamId);
  const { data: weekRaces = [], isLoading: weekRacesLoading } = useWeekRaces(teamId);
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(teamId);
  const { data: stats, isLoading: statsLoading } = useTeamStats(teamId, activeSeason?.id);
  const { data: teamAthletes = [], isLoading: athletesLoading } = useTeamAthletes(
    isCoach ? teamId : undefined,
    activeSeason?.id
  );
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentAthleteActivity(
    isCoach ? teamId : undefined,
    10
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your team.
        </p>
      </div>

      <QuickStats 
        totalAthletes={stats?.totalAthletes ?? 0}
        workoutsCompleted={stats?.workoutsCompleted ?? 0}
        weeklyMiles={stats?.weeklyMiles ?? 0}
        isLoading={statsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {todayRace ? (
            <TodayRace race={todayRace} isLoading={raceLoading} />
          ) : (
            <TodayWorkout workout={todayWorkout} isLoading={todayLoading} />
          )}
          {isCoach && (
            <WorkoutCompliance
              workout={todayWorkout ?? null}
              athletes={teamAthletes}
              isLoading={todayLoading || athletesLoading}
            />
          )}
          <AnnouncementCard announcements={announcements} isLoading={announcementsLoading} isCoach={isCoach} />
        </div>

        <div className="space-y-6">
          <WeekPreview 
            workouts={weekWorkouts} 
            races={weekRaces}
            isLoading={weekLoading || weekRacesLoading} 
          />
          {isCoach && (
            <RecentAthleteActivity 
              activities={recentActivity} 
              isLoading={activityLoading} 
            />
          )}
          {isAthlete && <ParentAccessCard />}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isParent } = useAuth();

  return (
    <AppLayout>
      {isParent ? <ParentDashboard /> : <CoachAthleteDashboard />}
    </AppLayout>
  );
}
