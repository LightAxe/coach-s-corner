-- Fix the is_parent_of_athlete function to use correct column name
CREATE OR REPLACE FUNCTION public.is_parent_of_athlete(_parent_id uuid, _athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_athlete_links pal
    INNER JOIN public.team_athletes ta ON ta.id = pal.team_athlete_id
    WHERE pal.parent_id = _parent_id 
    AND ta.profile_id = _athlete_id
  );
$$;