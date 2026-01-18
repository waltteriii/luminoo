-- Add default_view column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_view text DEFAULT 'year' 
CHECK (default_view IN ('year', 'month', 'week', 'day'));