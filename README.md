# Coach's Corner

A comprehensive team training management and athlete tracking platform designed for cross country and track & field coaches and their teams.

> **Status:** In active development

## Overview

Coach's Corner solves the coordination challenges faced by running coaches and their teams:

- **For Coaches:** Centralized platform to manage team rosters, schedule workouts, track races, publish announcements, and monitor athlete progress across the season
- **For Athletes:** Personal training journal to log workouts, track PRs and season records, view upcoming races and scheduled training
- **For Parents:** Read-only visibility into their child's training activity and team schedule

## Features

### Dashboard
- Quick stats overview (total athletes, workouts completed, weekly mileage)
- Today's workout or race at a glance
- Week preview with upcoming events
- Team announcements board
- Recent athlete activity feed (coaches only)

### Training Calendar
- Weekly calendar view of scheduled workouts and races
- Add workouts from scratch or from reusable templates
- Schedule races with full event details
- Navigate between weeks easily

### Workout Management
- **Workout Types:** Easy, tempo, interval, long run, rest day, race day
- **Workout Templates:** Create reusable workout definitions
- **Athlete Logging:** Athletes log their training with:
  - Completion status (none, partial, complete)
  - RPE/effort level (1-10 scale)
  - How they felt (predefined options + custom input)
  - Distance run (miles or kilometers)
  - Freeform notes

### Race Management
- Create races with date, location, and distance
- Add transportation info and map links
- Track individual race results per athlete
- Link to official results

### Records & Leaderboards
- Personal records (PRs) by distance
- Season records tracking
- Team leaderboards by distance
- Log off-season race results

### Training Journal
- Personal workout history with detailed metrics
- Race results history
- Filter by date range (7/14/30 days, all-time)
- Expandable entries with full details

### Team Management
- Create teams with unique 6-character join codes
- Athletes and parents join using team codes
- Manage team rosters
- Season-based organization
- Multi-team support for coaches

### Authentication
- Passwordless OTP-based email authentication
- Role-based access (Coach, Athlete, Parent)
- Team-scoped permissions

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| React Router 6 | Client-side routing |
| TanStack Query | Server state management |
| React Hook Form + Zod | Form handling and validation |
| shadcn/ui | Component library (Radix UI primitives) |
| Tailwind CSS | Styling |
| Recharts | Data visualization |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Database (PostgreSQL) and authentication |
| Supabase Edge Functions | Serverless functions (Deno runtime) |
| Resend | Transactional email delivery |

### Development
| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| React Testing Library | Component testing |
| ESLint | Code linting |

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn
- A Supabase account (for backend services)
- A Resend account (for email delivery)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/coach-s-corner.git
cd coach-s-corner

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

For the Supabase Edge Functions, configure these secrets in your Supabase dashboard:

```
RESEND_API_KEY=your_resend_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=https://your_project_id.supabase.co
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 8080 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui component library
│   ├── layout/             # App layout and navigation
│   ├── dashboard/          # Dashboard widgets
│   ├── calendar/           # Calendar components
│   ├── athletes/           # Athlete management
│   ├── races/              # Race components
│   ├── records/            # Records and leaderboards
│   ├── workouts/           # Workout logging
│   ├── seasons/            # Season management
│   └── journal/            # Training journal
├── pages/                  # Route page components
├── contexts/               # React context providers
│   └── AuthContext.tsx     # Global auth state
├── hooks/                  # Custom React hooks
│   ├── useDashboardData.ts
│   ├── useWorkoutLogs.ts
│   ├── useRaceResults.ts
│   ├── useRecords.ts
│   └── ...
├── integrations/
│   └── supabase/           # Supabase client and types
├── lib/
│   ├── types.ts            # Application type definitions
│   └── utils.ts            # Utility functions
└── test/                   # Test setup

supabase/
├── config.toml             # Supabase project config
├── functions/              # Edge functions
│   ├── send-otp/           # OTP email sender
│   └── verify-otp/         # OTP verification
└── migrations/             # Database migrations
```

---

## Database Schema

### Core Entities

| Table | Description |
|-------|-------------|
| `profiles` | User accounts with role (coach/athlete/parent) |
| `teams` | Team organizations with join codes |
| `team_memberships` | Links users to teams with roles |
| `team_athletes` | Team roster (athletes on a team) |
| `seasons` | Training seasons per team |
| `scheduled_workouts` | Workout calendar entries |
| `workout_logs` | Athlete workout completions |
| `workout_templates` | Reusable workout definitions |
| `races` | Race events |
| `race_results` | Individual race results |
| `distances` | Standard race distances |
| `announcements` | Team announcements |
| `parent_athlete_links` | Parent-to-athlete access |
| `otp_codes` | Authentication codes |

### Security

- Row-Level Security (RLS) policies enforce access control at the database level
- Users can only access data for teams they belong to
- Coaches have elevated permissions for team management
- Parents have read-only access to linked athletes

---

## Architecture

### Authentication Flow

1. User enters email on login/signup
2. Edge function generates 6-digit OTP and sends via Resend
3. User enters OTP on verification page
4. Edge function validates OTP, creates/retrieves user, generates session
5. Frontend establishes authenticated session

### Data Flow

- **React Query** manages server state with automatic caching and refetching
- **Custom hooks** encapsulate data fetching logic per domain
- **Supabase client** handles all database operations
- **RLS policies** enforce authorization at the database layer

### Key Patterns

- **Type Safety:** End-to-end TypeScript with auto-generated Supabase types
- **Component Composition:** Reusable shadcn/ui components
- **Hook-Based Architecture:** Domain-specific hooks for data operations
- **Context for Global State:** Auth state managed via React Context

---

## User Roles

### Coach
- Create and manage teams
- Add athletes to roster
- Schedule workouts and races
- View all athlete activity and logs
- Post team announcements
- Access team-wide statistics

### Athlete
- Join teams with invite codes
- View scheduled workouts and races
- Log workout completion with details
- Track personal records
- View personal training journal

### Parent
- Join teams with invite codes
- View linked athlete's activity (read-only)
- See team schedule and announcements

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and file organization
- Use TypeScript strict mode
- Add types for all new code
- Write tests for critical functionality
- Use React Query for server state
- Follow the hook-based data fetching pattern

---

## License

This project is private and not licensed for public use.

---

## Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
