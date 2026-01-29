import { useState } from 'react';
import { Plus, Clock, MapPin, Search, Dumbbell } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkoutTemplates } from '@/hooks/useDashboardData';
import { getWorkoutTypeBadgeClass, WorkoutType } from '@/lib/types';
import { cn } from '@/lib/utils';

const workoutTypes: { value: WorkoutType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Interval' },
  { value: 'long', label: 'Long' },
  { value: 'rest', label: 'Rest' },
];

export default function Workouts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<WorkoutType | 'all'>('all');
  
  const { currentTeam } = useAuth();
  const { data: templates = [], isLoading } = useWorkoutTemplates(currentTeam?.id);

  const filteredWorkouts = templates.filter((workout) => {
    const matchesSearch = workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workout.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = selectedType === 'all' || workout.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Workout Library</h1>
            <p className="text-muted-foreground">
              Browse and manage reusable workout templates
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Workout
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {workoutTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-1 bg-muted" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-10 w-10 text-muted-foreground mb-3" />
              {templates.length === 0 ? (
                <>
                  <p className="text-muted-foreground text-center mb-4">
                    No workout templates yet
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workout
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-center mb-4">
                    No workouts found matching your criteria
                  </p>
                  <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedType('all'); }}>
                    Clear Filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Workout grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkouts.map((workout) => (
              <Card 
                key={workout.id} 
                className="group hover:shadow-md transition-all cursor-pointer overflow-hidden"
              >
                <div className={cn('h-1', `bg-workout-${workout.type}`)} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{workout.name}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={cn('capitalize text-xs shrink-0', getWorkoutTypeBadgeClass(workout.type))}
                    >
                      {workout.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workout.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workout.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {workout.distance && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{workout.distance}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" className="w-full">
                      Assign to Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
