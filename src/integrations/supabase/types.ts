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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string
          graded_at: string | null
          id: string
          score: number | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url: string
          graded_at?: string | null
          id?: string
          score?: number | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string
          graded_at?: string | null
          id?: string
          score?: number | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean
          max_score: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean
          max_score?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean
          max_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_announcement: boolean
          message: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          message: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"]
          add_watermark: boolean
          allow_download: boolean
          chapter_name: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_size: number | null
          file_url: string
          folder_id: string | null
          id: string
          name: string
          sort_order: number
          unit_name: string | null
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["access_type"]
          add_watermark?: boolean
          allow_download?: boolean
          chapter_name?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_url: string
          folder_id?: string | null
          id?: string
          name: string
          sort_order?: number
          unit_name?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"]
          add_watermark?: boolean
          allow_download?: boolean
          chapter_name?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_url?: string
          folder_id?: string | null
          id?: string
          name?: string
          sort_order?: number
          unit_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      content_access: {
        Row: {
          content_id: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_access_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          content_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          content_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          content_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          chat_enabled: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_launched: boolean
          payment_link: string | null
          payment_mode: string
          price: number
          semester: number | null
          subject: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          chat_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_launched?: boolean
          payment_link?: string | null
          payment_mode?: string
          price?: number
          semester?: number | null
          subject?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          chat_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_launched?: boolean
          payment_link?: string | null
          payment_mode?: string
          price?: number
          semester?: number | null
          subject?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          token_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          token_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "folders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          full_name: string
          id: string
          is_approved: boolean
          semester: number | null
          theme_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_approved?: boolean
          semester?: number | null
          theme_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_approved?: boolean
          semester?: number | null
          theme_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          correct_option: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          sort_order: number
          test_id: string
        }
        Insert: {
          correct_option: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          sort_order?: number
          test_id: string
        }
        Update: {
          correct_option?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          sort_order?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_submissions: {
        Row: {
          answers: Json
          id: string
          score: number | null
          submitted_at: string
          test_id: string
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          score?: number | null
          submitted_at?: string
          test_id: string
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          score?: number | null
          submitted_at?: string
          test_id?: string
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_submissions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          time_limit_minutes: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          time_limit_minutes?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          time_limit_minutes?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          code: string
          course_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_test_questions_safe: {
        Args: { p_test_id: string }
        Returns: {
          correct_option: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          sort_order: number
          test_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_token: { Args: { token_code: string }; Returns: Json }
    }
    Enums: {
      access_type: "free" | "paid" | "specific"
      app_role: "student" | "teacher" | "admin"
      content_type: "pdf" | "image"
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
      access_type: ["free", "paid", "specific"],
      app_role: ["student", "teacher", "admin"],
      content_type: ["pdf", "image"],
    },
  },
} as const
