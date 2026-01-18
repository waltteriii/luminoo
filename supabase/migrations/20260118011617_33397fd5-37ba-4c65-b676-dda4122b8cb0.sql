-- Add highlight_color column to profiles for customizable accent colors
ALTER TABLE public.profiles 
ADD COLUMN highlight_color text DEFAULT 'blue' CHECK (highlight_color IN ('blue', 'teal', 'pink', 'amber', 'purple'));