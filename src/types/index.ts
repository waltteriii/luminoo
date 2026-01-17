// Creator Types
export type CreatorType = 
  | 'musician'
  | 'visual_artist'
  | 'writer'
  | 'coach'
  | 'content_creator'
  | 'entrepreneur'
  | 'other';

export type Platform = 
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'spotify'
  | 'newsletter'
  | 'blog'
  | 'twitter'
  | 'linkedin'
  | 'podcast'
  | 'other';

// Energy States
export type EnergyLevel = 'high' | 'medium' | 'low' | 'recovery';

// Time Models
export type TimeModel = 'event-based' | 'state-based';

// Phase Types
export type PhaseType = 'planning' | 'creation' | 'launch' | 'reflection';

// Campaign Status
export type CampaignStatus = 'planned' | 'active' | 'completed' | 'paused';

// Suggestion Status
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'scheduled';

// Urgency Levels
export type Urgency = 'low' | 'normal' | 'high' | 'critical';

// User Profile
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  creator_type: CreatorType | null;
  niche_keywords: string[];
  platforms: Platform[];
  audience_description: string | null;
  ai_profile_summary: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Phase (Annual Planning Period)
export interface Phase {
  id: string;
  user_id: string;
  name: string;
  type: PhaseType;
  start_month: number;
  end_month: number;
  description: string | null;
  color: string | null;
  created_at: string;
}

// Campaign
export interface Campaign {
  id: string;
  user_id: string;
  phase_id: string | null;
  name: string;
  description: string | null;
  month: number;
  week: number | null;
  energy_level: EnergyLevel;
  status: CampaignStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Task
export interface Task {
  id: string;
  user_id: string;
  campaign_id: string | null;
  title: string;
  description: string | null;
  energy_level: EnergyLevel;
  time_model: TimeModel;
  due_date: string | null;
  suggested_timeframe: string | null;
  urgency: Urgency;
  emotional_note: string | null;
  completed: boolean;
  detected_from_brain_dump: boolean;
  created_at: string;
  updated_at: string;
}

// Brain Dump
export interface BrainDump {
  id: string;
  user_id: string;
  raw_text: string;
  ai_parsed_result: ParsedBrainDumpResult | null;
  user_highlights: UserHighlight[];
  items_added_to_planner: string[];
  created_at: string;
}

export interface UserHighlight {
  text: string;
  start_index: number;
  end_index: number;
  energy_level: EnergyLevel;
}

export interface ParsedBrainDumpResult {
  items: ParsedItem[];
  summary: string | null;
}

export interface ParsedItem {
  text: string;
  type: 'task' | 'campaign' | 'idea';
  detected_energy: EnergyLevel;
  user_override_energy: EnergyLevel | null;
  suggested_timeframe: string | null;
  urgency: Urgency;
  emotional_note: string | null;
  confidence: number;
  related_items: string[];
}

// Content Suggestion (AI-generated)
export interface ContentSuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  content_type: string;
  suggested_date: string | null;
  reason: string;
  trend_source: string | null;
  platform: Platform | null;
  energy_level: EnergyLevel;
  confidence: number;
  status: SuggestionStatus;
  related_campaign_id: string | null;
  created_at: string;
}

// Trend Cache
export interface TrendCache {
  id: string;
  topic: string;
  relevance_score: number;
  source_type: 'news' | 'social' | 'seasonal' | 'industry';
  niche_keywords: string[];
  detected_at: string;
  expires_at: string;
}

// View Types
export type ViewMode = 'grid' | 'circular' | 'timeline';
export type ZoomLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';

// App State
export interface AppState {
  view_mode: ViewMode;
  zoom_level: ZoomLevel;
  focused_month: number | null;
  focused_quarter: number | null;
  current_energy: EnergyLevel;
  theme: 'light' | 'dark';
}
