-- Fix 1: Add RLS policies to profiles_public view
-- Since profiles_public is a VIEW on the profiles table, we need to ensure
-- the view uses security_invoker=on so RLS policies on profiles apply

-- Drop and recreate the view with security_invoker
DROP VIEW IF EXISTS public.profiles_public;

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

-- Fix 2: Add missing UPDATE policy to trend_bookmarks table
CREATE POLICY "Users can update their own bookmarks"
ON public.trend_bookmarks
FOR UPDATE
USING (auth.uid() = user_id);