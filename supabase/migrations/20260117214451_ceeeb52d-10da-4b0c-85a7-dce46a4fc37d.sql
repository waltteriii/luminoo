-- Add location field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';