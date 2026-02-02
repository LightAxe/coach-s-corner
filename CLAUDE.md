# Coach's Corner - Claude Code Context

A team training management platform for cross country/track coaches, athletes, and parents.

## Quick Reference

```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Run tests
npx tsc --noEmit # Type check
```

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State:** TanStack Query (server state), React Context (auth)
- **Forms:** React Hook Form + Zod validation
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Email:** Resend (via Edge Functions)

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components (don't modify directly)
│   ├── layout/       # AppLayout, navigation
│   ├── athletes/     # Athlete management, ACWR, workout history
│   ├── calendar/     # Weekly calendar view
│   ├── dashboard/    # Dashboard widgets
│   ├── workouts/     # Workout logging dialogs
│   ├── races/        # Race management
│   ├── records/      # PRs and leaderboards
│   └── journal/      # Training journal
├── pages/            # Route components
├── hooks/            # Data fetching hooks (useWorkoutLogs, useTeamAthletes, etc.)
├── contexts/         # AuthContext (global auth state)
├── integrations/supabase/  # Supabase client + auto-generated types
└── lib/
    ├── types.ts      # App types extending DB types
    └── utils.ts      # cn() helper for Tailwind classes

supabase/
├── functions/        # Edge functions (send-otp, verify-otp)
└── migrations/       # Database migrations
```

## Key Patterns

### Data Fetching
All data fetching uses custom hooks with TanStack Query:
```typescript
// Pattern: src/hooks/use{Domain}.ts
export function useTeamAthletes(teamId?: string) {
  return useQuery({
    queryKey: ['team-athletes', teamId],
    queryFn: async () => { /* supabase query */ },
    enabled: !!teamId,
  });
}
```

### Mutations
Mutations invalidate related queries:
```typescript
export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => { /* insert */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-log'] });
      queryClient.invalidateQueries({ queryKey: ['team-athlete-all-logs'] });
    },
  });
}
```

### Types
Database types are auto-generated. App types extend them in `src/lib/types.ts`:
```typescript
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
export type TeamAthleteWithProfile = TeamAthlete & { profiles?: Profile | null };
```

## User Roles

Access via `useAuth()` hook:
- `isCoach` - Full team management, can log workouts for athletes
- `isAthlete` - Personal logging, view team schedule
- `isParent` - Read-only access to linked athlete

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with role |
| `teams` | Teams with 6-char join codes |
| `team_athletes` | Roster (can be "shell" athletes without profile) |
| `team_memberships` | User-to-team links |
| `scheduled_workouts` | Calendar entries |
| `workout_logs` | Athlete completions (scheduled or personal) |
| `races` | Race events |
| `race_results` | Individual results |

### Shell Athletes
Athletes on roster without app accounts. `team_athletes.profile_id` is null. Coaches log workouts for them using `team_athlete_id`.

### Workout Logs
Two types in same table:
- **Scheduled:** `scheduled_workout_id` set, `workout_date` null
- **Personal:** `scheduled_workout_id` null, `workout_date` set

## Common Components

### Dialogs
- `WorkoutLogDialog` - Log scheduled workout completion
- `PersonalWorkoutDialog` - Log personal workout (supports `teamAthleteId` for coach logging)

### Forms
Use React Hook Form + Zod. Pattern:
```typescript
const formSchema = z.object({ /* ... */ });
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* ... */ },
});
```

### Badges
Workout type badges use `getWorkoutTypeBadgeClass(type)` from `lib/types.ts`.

## Environment

```env
VITE_SUPABASE_PROJECT_ID=xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=xxx
```

## Testing

Vitest + React Testing Library. Test files in `src/test/`.

## Conventions

- Hooks return `{ data, isLoading, error }` from TanStack Query
- Page components in `src/pages/`, exported as default
- Use `cn()` utility for conditional Tailwind classes
- Prefer editing existing files over creating new ones
- Keep components focused; extract to separate files when > 150 lines
