-- Fix 1: Remove unused profiles_public view to reduce attack surface
-- The frontend now queries the main profiles table directly which has proper RLS
DROP VIEW IF EXISTS public.profiles_public;