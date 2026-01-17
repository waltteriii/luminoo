-- Create friendships table for friend connections
CREATE TABLE public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they received (to accept/decline)
CREATE POLICY "Users can respond to friend requests"
ON public.friendships
FOR UPDATE
USING (auth.uid() = friend_id);

-- Users can delete their own friend requests or accepted friendships
CREATE POLICY "Users can delete friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Add is_shared column to tasks for sharing visibility
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

-- Create shared_calendars table for calendar sharing preferences
CREATE TABLE public.shared_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (owner_id, shared_with_id)
);

-- Enable RLS
ALTER TABLE public.shared_calendars ENABLE ROW LEVEL SECURITY;

-- Users can view calendars shared with them or that they own
CREATE POLICY "Users can view their shared calendars"
ON public.shared_calendars
FOR SELECT
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

-- Users can share their calendar
CREATE POLICY "Users can share their calendar"
ON public.shared_calendars
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own calendar shares
CREATE POLICY "Users can update their calendar shares"
ON public.shared_calendars
FOR UPDATE
USING (auth.uid() = owner_id);

-- Users can delete their calendar shares
CREATE POLICY "Users can delete their calendar shares"
ON public.shared_calendars
FOR DELETE
USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

-- Update tasks RLS to allow viewing shared tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view own and shared tasks"
ON public.tasks
FOR SELECT
USING (
    auth.uid() = user_id 
    OR (is_shared = true AND auth.uid() = ANY(shared_with))
    OR EXISTS (
        SELECT 1 FROM public.shared_calendars 
        WHERE owner_id = tasks.user_id 
        AND shared_with_id = auth.uid()
    )
);

-- Create trigger to update updated_at on friendships
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();