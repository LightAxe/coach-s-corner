-- Drop and recreate teams INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;
CREATE POLICY "Coaches can create teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Drop and recreate teams SELECT policy as PERMISSIVE  
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
CREATE POLICY "Team members can view teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (is_team_member(id, auth.uid()));

-- Also need to allow coaches to see teams they just created (before membership exists)
CREATE POLICY "Creators can view their teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (auth.uid() = created_by);

-- Fix team_memberships INSERT policy
DROP POLICY IF EXISTS "Users can join teams" ON public.team_memberships;
CREATE POLICY "Users can join teams" 
ON public.team_memberships 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = profile_id);