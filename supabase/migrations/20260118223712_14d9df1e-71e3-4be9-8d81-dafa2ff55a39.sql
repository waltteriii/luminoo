-- Create a public view for profiles that excludes email
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  display_name,
  avatar_url,
  creator_type,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Update the SELECT policy on profiles to be more restrictive
-- Users can only see their own profile OR profiles of people they have accepted friendships with
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or connected friends" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' 
    AND (
      (user_id = auth.uid() AND friend_id = profiles.id) 
      OR 
      (friend_id = auth.uid() AND user_id = profiles.id)
    )
  )
);