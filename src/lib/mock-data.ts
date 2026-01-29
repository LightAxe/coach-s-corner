// Mock data for XC Training Hub

export type WorkoutType = 'easy' | 'tempo' | 'interval' | 'long' | 'rest';

export interface Workout {
  id: string;
  title: string;
  type: WorkoutType;
  description: string;
  distance?: string;
  duration?: string;
  date: string;
  notes?: string;
}

export interface RaceDistance {
  id: string;
  name: string;
  meters: number;
}

export interface PersonalRecord {
  athleteId: string;
  distanceId: string;
  time: string; // Format: "MM:SS" or "HH:MM:SS"
  date: string;
  race?: string;
}

export interface WorkoutLog {
  id: string;
  athleteId: string;
  workoutId: string;
  completed: boolean;
  effortLevel: number; // 1-10
  notes?: string;
  completedAt: string;
}

export interface Athlete {
  id: string;
  name: string;
  grade: number;
  gender: 'M' | 'F';
  avatar?: string;
  prs: PersonalRecord[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'normal' | 'important';
}

// Race distances
export const raceDistances: RaceDistance[] = [
  { id: 'd-1', name: '3K', meters: 3000 },
  { id: 'd-2', name: '5K', meters: 5000 },
  { id: 'd-3', name: 'Mile', meters: 1609 },
  { id: 'd-4', name: '2 Mile', meters: 3218 },
];

// Mock athletes
export const athletes: Athlete[] = [
  {
    id: 'a-1',
    name: 'Emma Johnson',
    grade: 11,
    gender: 'F',
    prs: [
      { athleteId: 'a-1', distanceId: 'd-1', time: '11:45', date: '2024-10-15', race: 'Conference Meet' },
      { athleteId: 'a-1', distanceId: 'd-2', time: '20:12', date: '2024-09-28', race: 'Harvest Invitational' },
    ],
  },
  {
    id: 'a-2',
    name: 'Marcus Chen',
    grade: 12,
    gender: 'M',
    prs: [
      { athleteId: 'a-2', distanceId: 'd-1', time: '9:52', date: '2024-10-15', race: 'Conference Meet' },
      { athleteId: 'a-2', distanceId: 'd-2', time: '16:45', date: '2024-11-02', race: 'State Qualifier' },
    ],
  },
  {
    id: 'a-3',
    name: 'Sofia Rodriguez',
    grade: 10,
    gender: 'F',
    prs: [
      { athleteId: 'a-3', distanceId: 'd-1', time: '12:30', date: '2024-09-14', race: 'Season Opener' },
      { athleteId: 'a-3', distanceId: 'd-2', time: '21:48', date: '2024-10-05', race: 'Hill Country Classic' },
    ],
  },
  {
    id: 'a-4',
    name: 'Jake Williams',
    grade: 11,
    gender: 'M',
    prs: [
      { athleteId: 'a-4', distanceId: 'd-1', time: '10:15', date: '2024-10-15', race: 'Conference Meet' },
      { athleteId: 'a-4', distanceId: 'd-2', time: '17:32', date: '2024-09-28', race: 'Harvest Invitational' },
    ],
  },
  {
    id: 'a-5',
    name: 'Lily Thompson',
    grade: 9,
    gender: 'F',
    prs: [
      { athleteId: 'a-5', distanceId: 'd-1', time: '13:05', date: '2024-09-14', race: 'Season Opener' },
      { athleteId: 'a-5', distanceId: 'd-2', time: '23:15', date: '2024-09-28', race: 'Harvest Invitational' },
    ],
  },
  {
    id: 'a-6',
    name: 'Ethan Brown',
    grade: 10,
    gender: 'M',
    prs: [
      { athleteId: 'a-6', distanceId: 'd-1', time: '10:45', date: '2024-10-05', race: 'Hill Country Classic' },
      { athleteId: 'a-6', distanceId: 'd-2', time: '18:20', date: '2024-10-15', race: 'Conference Meet' },
    ],
  },
];

// Mock workout library
export const workoutLibrary: Omit<Workout, 'date'>[] = [
  {
    id: 'wl-1',
    title: 'Easy Recovery Run',
    type: 'easy',
    description: 'Relaxed pace, focus on form and breathing. Keep heart rate low.',
    distance: '3-4 miles',
    duration: '25-35 min',
  },
  {
    id: 'wl-2',
    title: 'Tempo Run',
    type: 'tempo',
    description: 'Comfortably hard pace. Should be able to speak in short sentences.',
    distance: '4-5 miles',
    duration: '30-40 min',
    notes: '10 min warmup, 20 min tempo, 10 min cooldown',
  },
  {
    id: 'wl-3',
    title: '800m Repeats',
    type: 'interval',
    description: '6x800m at 5K race pace with 400m recovery jog between each.',
    distance: '5 miles total',
    duration: '45 min',
  },
  {
    id: 'wl-4',
    title: 'Long Run',
    type: 'long',
    description: 'Steady, conversational pace. Build aerobic base.',
    distance: '8-10 miles',
    duration: '60-80 min',
  },
  {
    id: 'wl-5',
    title: 'Hill Repeats',
    type: 'interval',
    description: '8x200m hill sprints with jog-down recovery. Focus on driving arms.',
    distance: '4 miles total',
    duration: '40 min',
  },
  {
    id: 'wl-6',
    title: 'Fartlek',
    type: 'tempo',
    description: 'Speed play - alternate between fast and easy running based on feel.',
    distance: '5 miles',
    duration: '35-40 min',
  },
  {
    id: 'wl-7',
    title: 'Rest Day',
    type: 'rest',
    description: 'Complete rest or light stretching/yoga. Stay hydrated.',
  },
];

// Get current week dates
const getWeekDates = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date.toISOString().split('T')[0];
  });
};

const weekDates = getWeekDates();

// Mock scheduled workouts for the current week
export const scheduledWorkouts: Workout[] = [
  { ...workoutLibrary[0], id: 'sw-1', date: weekDates[0] },
  { ...workoutLibrary[2], id: 'sw-2', date: weekDates[1] },
  { ...workoutLibrary[0], id: 'sw-3', date: weekDates[2] },
  { ...workoutLibrary[1], id: 'sw-4', date: weekDates[3] },
  { ...workoutLibrary[0], id: 'sw-5', date: weekDates[4] },
  { ...workoutLibrary[4], id: 'sw-6', date: weekDates[5] },
  { ...workoutLibrary[6], id: 'sw-7', date: weekDates[6] },
];

// Mock workout logs
export const workoutLogs: WorkoutLog[] = [
  { id: 'log-1', athleteId: 'a-1', workoutId: 'sw-1', completed: true, effortLevel: 4, notes: 'Felt good, legs fresh', completedAt: weekDates[0] },
  { id: 'log-2', athleteId: 'a-2', workoutId: 'sw-1', completed: true, effortLevel: 3, completedAt: weekDates[0] },
  { id: 'log-3', athleteId: 'a-3', workoutId: 'sw-1', completed: true, effortLevel: 5, notes: 'A bit tired from yesterday', completedAt: weekDates[0] },
  { id: 'log-4', athleteId: 'a-1', workoutId: 'sw-2', completed: true, effortLevel: 8, notes: 'Nailed my splits!', completedAt: weekDates[1] },
  { id: 'log-5', athleteId: 'a-2', workoutId: 'sw-2', completed: true, effortLevel: 7, completedAt: weekDates[1] },
];

// Mock announcements
export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Saturday Practice Location Change',
    content: 'Due to field maintenance, Saturday\'s long run will start from Memorial Park instead of the school. Meet at the main pavilion at 7:30 AM.',
    date: new Date().toISOString().split('T')[0],
    priority: 'important',
  },
  {
    id: 'ann-2',
    title: 'Conference Meet - Next Weekend',
    content: 'The conference championship is Saturday, Nov 2nd. Bus leaves at 6:00 AM sharp. Make sure to bring your uniform, spikes, and flats.',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    priority: 'normal',
  },
];

// Helper to get today's workout
export const getTodayWorkout = (): Workout | undefined => {
  const today = new Date().toISOString().split('T')[0];
  return scheduledWorkouts.find(w => w.date === today);
};

// Helper to format time
export const formatTime = (time: string): string => {
  return time;
};

// Helper to get workout type color class
export const getWorkoutTypeColor = (type: WorkoutType): string => {
  const colors: Record<WorkoutType, string> = {
    easy: 'bg-workout-easy',
    tempo: 'bg-workout-tempo',
    interval: 'bg-workout-interval',
    long: 'bg-workout-long',
    rest: 'bg-workout-rest',
  };
  return colors[type];
};

export const getWorkoutTypeBadgeClass = (type: WorkoutType): string => {
  const classes: Record<WorkoutType, string> = {
    easy: 'bg-workout-easy/10 text-workout-easy border-workout-easy/20',
    tempo: 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/20',
    interval: 'bg-workout-interval/10 text-workout-interval border-workout-interval/20',
    long: 'bg-workout-long/10 text-workout-long border-workout-long/20',
    rest: 'bg-workout-rest/10 text-workout-rest border-workout-rest/20',
  };
  return classes[type];
};
