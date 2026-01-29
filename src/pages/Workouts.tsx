import { useState } from 'react';
import { Plus, Clock, MapPin, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { workoutLibrary, WorkoutType, getWorkoutTypeBadgeClass } from '@/lib/mock-data';
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

  const filteredWorkouts = workoutLibrary.filter((workout) => {
    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description.toLowerCase().includes(searchQuery.toLowerCase());
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

        {/* Workout grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkouts.map((workout) => (
            <Card 
              key={workout.id} 
              className="group hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              <div className={cn('h-1', `bg-workout-${workout.type}`)} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{workout.title}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={cn('capitalize text-xs shrink-0', getWorkoutTypeBadgeClass(workout.type))}
                  >
                    {workout.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workout.description}
                </p>
                
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {workout.distance && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{workout.distance}</span>
                    </div>
                  )}
                  {workout.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{workout.duration}</span>
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

        {filteredWorkouts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center mb-4">
                No workouts found matching your criteria
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedType('all'); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
