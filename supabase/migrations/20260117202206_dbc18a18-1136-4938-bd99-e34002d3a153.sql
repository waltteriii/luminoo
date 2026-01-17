-- Enable realtime for tasks table so shared calendar updates sync instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;