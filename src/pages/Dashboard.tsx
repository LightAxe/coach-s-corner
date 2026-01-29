import { AppLayout } from '@/components/layout/AppLayout';
import { TodayWorkout } from '@/components/dashboard/TodayWorkout';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { WeekPreview } from '@/components/dashboard/WeekPreview';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useTodayWorkout, 
  useScheduledWorkouts, 
  useAnnouncements, 
  useTeamStats 
} from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { currentTeam } = useAuth();
  const teamId = currentTeam?.id;

  const { data: todayWorkout, isLoading: todayLoading } = useTodayWorkout(teamId);
  const { data: weekWorkouts = [], isLoading: weekLoading } = useScheduledWorkouts(teamId);
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(teamId);
  const { data: stats, isLoading: statsLoading } = useTeamStats(teamId);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your team.
          </p>
        </div>

        {/* Quick stats */}
        <QuickStats 
          totalAthletes={stats?.totalAthletes ?? 0}
          workoutsCompleted={stats?.workoutsCompleted ?? 0}
          weeklyMiles={stats?.weeklyMiles ?? 0}
          isLoading={statsLoading}
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <TodayWorkout workout={todayWorkout} isLoading={todayLoading} />
            <AnnouncementCard announcements={announcements} isLoading={announcementsLoading} />
          </div>

          {/* Right column */}
          <div>
            <WeekPreview workouts={weekWorkouts} isLoading={weekLoading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
