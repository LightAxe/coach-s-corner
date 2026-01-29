import { AppLayout } from '@/components/layout/AppLayout';
import { TodayWorkout } from '@/components/dashboard/TodayWorkout';
import { AnnouncementCard } from '@/components/dashboard/AnnouncementCard';
import { WeekPreview } from '@/components/dashboard/WeekPreview';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { 
  getTodayWorkout, 
  scheduledWorkouts, 
  announcements, 
  athletes,
  workoutLogs 
} from '@/lib/mock-data';

export default function Dashboard() {
  const todayWorkout = getTodayWorkout();
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = workoutLogs.filter(log => log.completedAt === today);

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
          totalAthletes={athletes.length}
          workoutsCompleted={todayLogs.length}
          weeklyMiles={142}
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <TodayWorkout workout={todayWorkout} />
            <AnnouncementCard announcements={announcements} />
          </div>

          {/* Right column */}
          <div>
            <WeekPreview workouts={scheduledWorkouts} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
