-- Add end_date for multi-day tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date date;

-- Add start_time and end_time for time-based scheduling
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_time time;