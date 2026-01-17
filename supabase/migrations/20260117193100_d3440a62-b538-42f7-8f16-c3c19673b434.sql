-- Create enum types
CREATE TYPE public.creator_type AS ENUM (
  'musician',
  'visual_artist',
  'writer',
  'coach',
  'content_creator',
  'entrepreneur',
  'other'
);

CREATE TYPE public.energy_level AS ENUM ('high', 'medium', 'low', 'recovery');

CREATE TYPE public.phase_type AS ENUM ('planning', 'creation', 'launch', 'reflection');

CREATE TYPE public.campaign_status AS ENUM ('planned', 'active', 'completed', 'paused');

CREATE TYPE public.suggestion_status AS ENUM ('pending', 'accepted', 'dismissed', 'scheduled');

CREATE TYPE public.urgency_level AS ENUM ('low', 'normal', 'high', 'critical');

CREATE TYPE public.time_model AS ENUM ('event-based', 'state-based');

-- Profiles table (stores user profile data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  creator_type public.creator_type,
  niche_keywords TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  audience_description TEXT,
  ai_profile_summary TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Phases table (annual planning periods)
CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type public.phase_type NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  description TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on phases
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

-- Phases policies
CREATE POLICY "Users can view their own phases"
  ON public.phases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own phases"
  ON public.phases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phases"
  ON public.phases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phases"
  ON public.phases FOR DELETE
  USING (auth.uid() = user_id);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER CHECK (week >= 1 AND week <= 5),
  energy_level public.energy_level DEFAULT 'medium',
  status public.campaign_status DEFAULT 'planned',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  energy_level public.energy_level DEFAULT 'medium',
  time_model public.time_model DEFAULT 'event-based',
  due_date DATE,
  suggested_timeframe TEXT,
  urgency public.urgency_level DEFAULT 'normal',
  emotional_note TEXT,
  completed BOOLEAN DEFAULT FALSE,
  detected_from_brain_dump BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Brain dumps table
CREATE TABLE public.brain_dumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT NOT NULL,
  ai_parsed_result JSONB,
  user_highlights JSONB DEFAULT '[]',
  items_added_to_planner TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on brain_dumps
ALTER TABLE public.brain_dumps ENABLE ROW LEVEL SECURITY;

-- Brain dumps policies
CREATE POLICY "Users can view their own brain dumps"
  ON public.brain_dumps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brain dumps"
  ON public.brain_dumps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brain dumps"
  ON public.brain_dumps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brain dumps"
  ON public.brain_dumps FOR DELETE
  USING (auth.uid() = user_id);

-- Content suggestions table (AI-generated)
CREATE TABLE public.content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT,
  suggested_date DATE,
  reason TEXT,
  trend_source TEXT,
  platform TEXT,
  energy_level public.energy_level DEFAULT 'medium',
  confidence NUMERIC(3,2) DEFAULT 0.5,
  status public.suggestion_status DEFAULT 'pending',
  related_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on content_suggestions
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;

-- Content suggestions policies
CREATE POLICY "Users can view their own suggestions"
  ON public.content_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suggestions"
  ON public.content_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON public.content_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions"
  ON public.content_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();