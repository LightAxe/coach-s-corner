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
      announcements: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          priority: string
          team_id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          priority?: string
          team_id: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      distances: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      parent_athlete_links: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_athlete_links_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_athlete_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      race_results: {
        Row: {
          achieved_at: string | null
          created_at: string
          created_by: string
          distance_id: string | null
          id: string
          notes: string | null
          place: number | null
          race_id: string | null
          team_athlete_id: string
          time_seconds: number
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          created_by: string
          distance_id?: string | null
          id?: string
          notes?: string | null
          place?: number | null
          race_id?: string | null
          team_athlete_id: string
          time_seconds: number
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          created_by?: string
          distance_id?: string | null
          id?: string
          notes?: string | null
          place?: number | null
          race_id?: string | null
          team_athlete_id?: string
          time_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "race_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_distance_id_fkey"
            columns: ["distance_id"]
            isOneToOne: false
            referencedRelation: "distances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_team_athlete_id_fkey"
            columns: ["team_athlete_id"]
            isOneToOne: false
            referencedRelation: "team_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          distance_id: string | null
          id: string
          location: string | null
          map_link: string | null
          name: string
          race_date: string
          results_link: string | null
          season_id: string | null
          team_id: string
          transportation_info: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          distance_id?: string | null
          id?: string
          location?: string | null
          map_link?: string | null
          name: string
          race_date: string
          results_link?: string | null
          season_id?: string | null
          team_id: string
          transportation_info?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          distance_id?: string | null
          id?: string
          location?: string | null
          map_link?: string | null
          name?: string
          race_date?: string
          results_link?: string | null
          season_id?: string | null
          team_id?: string
          transportation_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "races_distance_id_fkey"
            columns: ["distance_id"]
            isOneToOne: false
            referencedRelation: "distances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "races_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "races_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_workouts: {
        Row: {
          athlete_notes: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          scheduled_date: string
          season_id: string | null
          team_id: string
          template_id: string | null
          title: string
          type: Database["public"]["Enums"]["workout_type"]
        }
        Insert: {
          athlete_notes?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          scheduled_date: string
          season_id?: string | null
          team_id: string
          template_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["workout_type"]
        }
        Update: {
          athlete_notes?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          scheduled_date?: string
          season_id?: string | null
          team_id?: string
          template_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["workout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_athletes: {
        Row: {
          created_at: string
          created_by: string
          first_name: string
          id: string
          last_name: string
          profile_id: string | null
          season_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          first_name: string
          id?: string
          last_name: string
          profile_id?: string | null
          season_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          first_name?: string
          id?: string
          last_name?: string
          profile_id?: string | null
          season_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_athletes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_athletes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_athletes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          join_code: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed: boolean
          completion_status:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at: string
          distance_unit: string | null
          distance_value: number | null
          effort_level: number | null
          how_felt: string | null
          id: string
          logged_by: string | null
          notes: string | null
          profile_id: string | null
          scheduled_workout_id: string
          team_athlete_id: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string
          distance_unit?: string | null
          distance_value?: number | null
          effort_level?: number | null
          how_felt?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          profile_id?: string | null
          scheduled_workout_id: string
          team_athlete_id?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string
          distance_unit?: string | null
          distance_value?: number | null
          effort_level?: number | null
          how_felt?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          profile_id?: string | null
          scheduled_workout_id?: string
          team_athlete_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_scheduled_workout_id_fkey"
            columns: ["scheduled_workout_id"]
            isOneToOne: false
            referencedRelation: "scheduled_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_team_athlete_id_fkey"
            columns: ["team_athlete_id"]
            isOneToOne: false
            referencedRelation: "team_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          athlete_notes: string | null
          created_at: string
          created_by: string
          description: string | null
          distance: string | null
          id: string
          name: string
          team_id: string
          type: Database["public"]["Enums"]["workout_type"]
          updated_at: string
        }
        Insert: {
          athlete_notes?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          distance?: string | null
          id?: string
          name: string
          team_id: string
          type?: Database["public"]["Enums"]["workout_type"]
          updated_at?: string
        }
        Update: {
          athlete_notes?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          distance?: string | null
          id?: string
          name?: string
          team_id?: string
          type?: Database["public"]["Enums"]["workout_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_athlete: { Args: { _athlete_id: string }; Returns: boolean }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      get_linked_athlete_ids: {
        Args: { _parent_id: string }
        Returns: string[]
      }
      get_team_ids_for_profile: {
        Args: { _profile_id: string }
        Returns: string[]
      }
      is_parent_of_athlete: {
        Args: { _athlete_id: string; _parent_id: string }
        Returns: boolean
      }
      is_team_coach: {
        Args: { _profile_id: string; _team_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _profile_id: string; _team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      completion_status: "none" | "partial" | "complete"
      distance_type:
        | "1600m"
        | "3000m"
        | "5000m"
        | "3200m"
        | "mile"
        | "2mile"
        | "other"
      user_role: "coach" | "athlete" | "parent"
      workout_type:
        | "easy"
        | "tempo"
        | "interval"
        | "long"
        | "rest"
        | "race"
        | "other"
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
      completion_status: ["none", "partial", "complete"],
      distance_type: [
        "1600m",
        "3000m",
        "5000m",
        "3200m",
        "mile",
        "2mile",
        "other",
      ],
      user_role: ["coach", "athlete", "parent"],
      workout_type: [
        "easy",
        "tempo",
        "interval",
        "long",
        "rest",
        "race",
        "other",
      ],
    },
  },
} as const
