-- Add display_order column for task reordering within overlapping time slots
ALTER TABLE public.tasks 
ADD COLUMN display_order integer DEFAULT 0;

-- Create an index for efficient ordering queries
CREATE INDEX idx_tasks_display_order ON public.tasks(due_date, start_time, display_order);