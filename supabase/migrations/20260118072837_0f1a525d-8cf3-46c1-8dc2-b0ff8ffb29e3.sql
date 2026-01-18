-- Add default_inbox_energy column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_inbox_energy text DEFAULT 'high' CHECK (default_inbox_energy IN ('high', 'medium', 'low', 'recovery'));