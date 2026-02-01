
# Announcements Management for Coaches

## Overview
This plan implements full CRUD functionality for team announcements, allowing coaches to create, edit, and delete announcements from the dashboard. The implementation follows existing patterns from the races and athletes features.

## Implementation Steps

### 1. Database: RLS Policies (Already Exist)
Based on the database schema review, the RLS policies for INSERT, UPDATE, and DELETE already exist:
- "Coaches can create announcements" - INSERT with `is_team_coach(team_id, auth.uid())`
- "Coaches can update announcements" - UPDATE with `is_team_coach(team_id, auth.uid())`  
- "Coaches can delete announcements" - DELETE with `is_team_coach(team_id, auth.uid())`

No database changes are required.

### 2. Create Announcements Hook
**File: `src/hooks/useAnnouncements.ts`**

Create a dedicated hook file with mutations following the existing pattern from `useRaces.ts`:
- `useAnnouncements(teamId)` - Fetch announcements (move from useDashboardData)
- `useCreateAnnouncement()` - Insert new announcement
- `useUpdateAnnouncement()` - Update existing announcement  
- `useDeleteAnnouncement()` - Delete announcement

The hook will:
- Use React Query's `useMutation` for create/update/delete
- Invalidate the `['announcements', teamId]` query key on success
- Include proper TypeScript types for the mutation data

### 3. Create Announcement Dialog Component
**File: `src/components/announcements/CreateAnnouncementDialog.tsx`**

A dialog for creating new announcements with:
- Title field (required, max 100 characters)
- Content textarea (optional, max 2000 characters)
- Priority radio group with "Normal" and "Important" options
- Submit button that inserts into announcements table
- Form validation using zod + react-hook-form (existing pattern)

### 4. Edit Announcement Dialog Component
**File: `src/components/announcements/EditAnnouncementDialog.tsx`**

Similar to CreateAnnouncementDialog but:
- Pre-populates form with existing announcement data
- Uses `useEffect` to reset form when announcement changes (like EditRaceDialog)
- Calls `useUpdateAnnouncement` mutation on submit

### 5. Delete Announcement Dialog Component
**File: `src/components/announcements/DeleteAnnouncementDialog.tsx`**

A confirmation dialog using `AlertDialog` component:
- Shows announcement title being deleted
- "Cancel" and "Delete" action buttons
- Uses destructive styling for delete button (existing pattern)

### 6. Update AnnouncementCard Component
**File: `src/components/dashboard/AnnouncementCard.tsx`**

Enhance the existing component to:
- Accept `isCoach` prop to conditionally show management controls
- Add a "New Announcement" button in the header (coach only)
- Add edit/delete buttons on each announcement card (coach only)
- Show empty state when no announcements: "No announcements yet" with create prompt for coaches
- Manage dialog state for create/edit/delete operations
- Pass `onRefresh` callback or rely on React Query cache invalidation

### 7. Update Dashboard Page
**File: `src/pages/Dashboard.tsx`**

- Pass `isCoach` prop to `AnnouncementCard`
- Import refactored `useAnnouncements` from new hook file

---

## Technical Details

### Data Types
```typescript
interface CreateAnnouncementData {
  team_id: string;
  title: string;
  content?: string;
  priority: 'normal' | 'important';
  created_by: string;
}

interface UpdateAnnouncementData {
  id: string;
  team_id: string;
  title?: string;
  content?: string;
  priority?: 'normal' | 'important';
}
```

### Form Validation Schema
```typescript
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  content: z.string().max(2000, 'Content too long').optional(),
  priority: z.enum(['normal', 'important']),
});
```

### Component Structure
```text
AnnouncementCard
  +-- Header with "New Announcement" button (coach only)
  +-- CreateAnnouncementDialog
  +-- Empty state (when no announcements)
  +-- Announcement items
       +-- Edit button (coach only)
       +-- Delete button (coach only)
  +-- EditAnnouncementDialog
  +-- DeleteAnnouncementDialog
```

---

## Files to Create
1. `src/hooks/useAnnouncements.ts` - CRUD hook for announcements
2. `src/components/announcements/CreateAnnouncementDialog.tsx` - Create dialog
3. `src/components/announcements/EditAnnouncementDialog.tsx` - Edit dialog
4. `src/components/announcements/DeleteAnnouncementDialog.tsx` - Delete confirmation

## Files to Modify
1. `src/components/dashboard/AnnouncementCard.tsx` - Add management UI and dialogs
2. `src/pages/Dashboard.tsx` - Pass isCoach prop to AnnouncementCard
3. `src/hooks/useDashboardData.ts` - Remove useAnnouncements (moved to dedicated file)
