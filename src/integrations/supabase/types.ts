export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brain_dumps: {
        Row: {
          ai_parsed_result: Json | null
          created_at: string
          id: string
          items_added_to_planner: string[] | null
          raw_text: string
          user_highlights: Json | null
          user_id: string
        }
        Insert: {
          ai_parsed_result?: Json | null
          created_at?: string
          id?: string
          items_added_to_planner?: string[] | null
          raw_text: string
          user_highlights?: Json | null
          user_id: string
        }
        Update: {
          ai_parsed_result?: Json | null
          created_at?: string
          id?: string
          items_added_to_planner?: string[] | null
          raw_text?: string
          user_highlights?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_dumps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          energy_level: Database["public"]["Enums"]["energy_level"] | null
          id: string
          month: number
          name: string
          phase_id: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          tags: string[] | null
          updated_at: string
          user_id: string
          week: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          month: number
          name: string
          phase_id?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          week?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          month?: number
          name?: string
          phase_id?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_suggestions: {
        Row: {
          confidence: number | null
          content_type: string | null
          created_at: string
          description: string
          energy_level: Database["public"]["Enums"]["energy_level"] | null
          id: string
          platform: string | null
          reason: string | null
          related_campaign_id: string | null
          status: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_date: string | null
          title: string
          trend_source: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content_type?: string | null
          created_at?: string
          description: string
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          platform?: string | null
          reason?: string | null
          related_campaign_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_date?: string | null
          title: string
          trend_source?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          content_type?: string | null
          created_at?: string
          description?: string
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          platform?: string | null
          reason?: string | null
          related_campaign_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"] | null
          suggested_date?: string | null
          title?: string
          trend_source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_suggestions_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_month: number
          id: string
          name: string
          start_month: number
          type: Database["public"]["Enums"]["phase_type"]
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_month: number
          id?: string
          name: string
          start_month: number
          type: Database["public"]["Enums"]["phase_type"]
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_month?: number
          id?: string
          name?: string
          start_month?: number
          type?: Database["public"]["Enums"]["phase_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_profile_summary: string | null
          audience_description: string | null
          avatar_url: string | null
          created_at: string
          creator_type: Database["public"]["Enums"]["creator_type"] | null
          default_view: string | null
          display_name: string | null
          email: string | null
          id: string
          niche_keywords: string[] | null
          onboarding_completed: boolean | null
          platforms: string[] | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ai_profile_summary?: string | null
          audience_description?: string | null
          avatar_url?: string | null
          created_at?: string
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          default_view?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          niche_keywords?: string[] | null
          onboarding_completed?: boolean | null
          platforms?: string[] | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ai_profile_summary?: string | null
          audience_description?: string | null
          avatar_url?: string | null
          created_at?: string
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          default_view?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          niche_keywords?: string[] | null
          onboarding_completed?: boolean | null
          platforms?: string[] | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shared_calendars: {
        Row: {
          can_edit: boolean | null
          created_at: string
          id: string
          owner_id: string
          shared_with_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string
          id?: string
          owner_id: string
          shared_with_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string
          id?: string
          owner_id?: string
          shared_with_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_calendars_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_calendars_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          campaign_id: string | null
          completed: boolean | null
          created_at: string
          description: string | null
          detected_from_brain_dump: boolean | null
          due_date: string | null
          emotional_note: string | null
          end_date: string | null
          end_time: string | null
          energy_level: Database["public"]["Enums"]["energy_level"] | null
          id: string
          is_shared: boolean | null
          location: string | null
          shared_with: string[] | null
          start_time: string | null
          suggested_timeframe: string | null
          time_model: Database["public"]["Enums"]["time_model"] | null
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          detected_from_brain_dump?: boolean | null
          due_date?: string | null
          emotional_note?: string | null
          end_date?: string | null
          end_time?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          is_shared?: boolean | null
          location?: string | null
          shared_with?: string[] | null
          start_time?: string | null
          suggested_timeframe?: string | null
          time_model?: Database["public"]["Enums"]["time_model"] | null
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          detected_from_brain_dump?: boolean | null
          due_date?: string | null
          emotional_note?: string | null
          end_date?: string | null
          end_time?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          is_shared?: boolean | null
          location?: string | null
          shared_with?: string[] | null
          start_time?: string | null
          suggested_timeframe?: string | null
          time_model?: Database["public"]["Enums"]["time_model"] | null
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      campaign_status: "planned" | "active" | "completed" | "paused"
      creator_type:
        | "musician"
        | "visual_artist"
        | "writer"
        | "coach"
        | "content_creator"
        | "entrepreneur"
        | "other"
      energy_level: "high" | "medium" | "low" | "recovery"
      phase_type: "planning" | "creation" | "launch" | "reflection"
      suggestion_status: "pending" | "accepted" | "dismissed" | "scheduled"
      time_model: "event-based" | "state-based"
      urgency_level: "low" | "normal" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      campaign_status: ["planned", "active", "completed", "paused"],
      creator_type: [
        "musician",
        "visual_artist",
        "writer",
        "coach",
        "content_creator",
        "entrepreneur",
        "other",
      ],
      energy_level: ["high", "medium", "low", "recovery"],
      phase_type: ["planning", "creation", "launch", "reflection"],
      suggestion_status: ["pending", "accepted", "dismissed", "scheduled"],
      time_model: ["event-based", "state-based"],
      urgency_level: ["low", "normal", "high", "critical"],
    },
  },
} as const
