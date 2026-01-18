-- Create table for bookmarked trends
CREATE TABLE public.trend_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_ideas TEXT[] NOT NULL DEFAULT '{}',
  platform TEXT,
  urgency TEXT,
  energy_level TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trend_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own bookmarks"
ON public.trend_bookmarks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON public.trend_bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.trend_bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_trend_bookmarks_user_id ON public.trend_bookmarks(user_id);