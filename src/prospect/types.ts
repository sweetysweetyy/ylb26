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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      pe_settings: {
        Row: {
          agent_name: string
          auto_reply: boolean
          calendar_link: string | null
          check_interval_minutes: number
          company_name: string | null
          created_at: string
          cta_type: string
          email_length: string
          follow_up_delay_hours: number
          forbidden_claims: string | null
          language: string
          max_follow_ups: number
          meeting_slots: string | null
          model_analysis: string
          model_research: string
          model_writing: string
          offer_description: string | null
          playbook: Json
          require_validation: boolean
          sender_name: string | null
          sender_role: string | null
          signature: string | null
          target_persona: string | null
          tone: string
          updated_at: string
          user_id: string
          value_proposition: string | null
        }
        Insert: {
          agent_name?: string
          auto_reply?: boolean
          calendar_link?: string | null
          check_interval_minutes?: number
          company_name?: string | null
          created_at?: string
          cta_type?: string
          email_length?: string
          follow_up_delay_hours?: number
          forbidden_claims?: string | null
          language?: string
          max_follow_ups?: number
          meeting_slots?: string | null
          model_analysis?: string
          model_research?: string
          model_writing?: string
          offer_description?: string | null
          playbook?: Json
          require_validation?: boolean
          sender_name?: string | null
          sender_role?: string | null
          signature?: string | null
          target_persona?: string | null
          tone?: string
          updated_at?: string
          user_id: string
          value_proposition?: string | null
        }
        Update: {
          agent_name?: string
          auto_reply?: boolean
          calendar_link?: string | null
          check_interval_minutes?: number
          company_name?: string | null
          created_at?: string
          cta_type?: string
          email_length?: string
          follow_up_delay_hours?: number
          forbidden_claims?: string | null
          language?: string
          max_follow_ups?: number
          meeting_slots?: string | null
          model_analysis?: string
          model_research?: string
          model_writing?: string
          offer_description?: string | null
          playbook?: Json
          require_validation?: boolean
          sender_name?: string | null
          sender_role?: string | null
          signature?: string | null
          target_persona?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
          value_proposition?: string | null
        }
        Relationships: []
      }
      pe_companies: {
        Row: {
          address: string | null
          ai_summary: string | null
          approach_angle: Json
          city: string | null
          confidence: string | null
          country: string | null
          created_at: string
          decision_makers: Json
          description: string | null
          email: string | null
          founded_year: string | null
          id: string
          legal_info: Json
          legal_name: string | null
          linkedin: string | null
          name: string
          phone: string | null
          pipeline_status: string
          prospect_understanding: Json
          region: string | null
          relevance_score: number
          score_breakdown: Json
          score_explanation: string | null
          search_id: string | null
          sector: string | null
          signals: Json
          size: string | null
          socials: Json
          sources: Json
          subsector: string | null
          updated_at: string
          user_id: string
          website: string | null
          why_contact: string | null
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          approach_angle?: Json
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          description?: string | null
          email?: string | null
          founded_year?: string | null
          id?: string
          legal_info?: Json
          legal_name?: string | null
          linkedin?: string | null
          name: string
          phone?: string | null
          pipeline_status?: string
          prospect_understanding?: Json
          region?: string | null
          relevance_score?: number
          score_breakdown?: Json
          score_explanation?: string | null
          search_id?: string | null
          sector?: string | null
          signals?: Json
          size?: string | null
          socials?: Json
          sources?: Json
          subsector?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          why_contact?: string | null
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          approach_angle?: Json
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          description?: string | null
          email?: string | null
          founded_year?: string | null
          id?: string
          legal_info?: Json
          legal_name?: string | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          pipeline_status?: string
          prospect_understanding?: Json
          region?: string | null
          relevance_score?: number
          score_breakdown?: Json
          score_explanation?: string | null
          search_id?: string | null
          sector?: string | null
          signals?: Json
          size?: string | null
          socials?: Json
          sources?: Json
          subsector?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          why_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "pe_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_messages: {
        Row: {
          analysis: Json
          body: string | null
          checks: Json
          created_at: string
          direction: string
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          prospection_id: string
          sent_at: string
          snippet: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json
          body?: string | null
          checks?: Json
          created_at?: string
          direction: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          prospection_id: string
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json
          body?: string | null
          checks?: Json
          created_at?: string
          direction?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          prospection_id?: string
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "pe_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_decisions: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          interest_score: number | null
          kind: string
          payload: Json
          prospection_id: string | null
          rationale: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          interest_score?: number | null
          kind: string
          payload?: Json
          prospection_id?: string | null
          rationale?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          interest_score?: number | null
          kind?: string
          payload?: Json
          prospection_id?: string | null
          rationale?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "olly_decisions_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "pe_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_prospections: {
        Row: {
          company_id: string
          contact_email: string | null
          created_at: string
          error: string | null
          follow_up_count: number
          gmail_thread_id: string | null
          id: string
          interest_score: number | null
          last_gmail_history_id: string | null
          last_intent: string | null
          last_message_at: string | null
          max_follow_ups: number
          memory: Json
          next_check_at: string | null
          pipeline_status: string
          state: string
          stop_reason: string | null
          strategy: Json
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          created_at?: string
          error?: string | null
          follow_up_count?: number
          gmail_thread_id?: string | null
          id?: string
          interest_score?: number | null
          last_gmail_history_id?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          max_follow_ups?: number
          memory?: Json
          next_check_at?: string | null
          pipeline_status?: string
          state?: string
          stop_reason?: string | null
          strategy?: Json
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          created_at?: string
          error?: string | null
          follow_up_count?: number
          gmail_thread_id?: string | null
          id?: string
          interest_score?: number | null
          last_gmail_history_id?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          max_follow_ups?: number
          memory?: Json
          next_check_at?: string | null
          pipeline_status?: string
          state?: string
          stop_reason?: string | null
          strategy?: Json
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pe_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_searches: {
        Row: {
          created_at: string
          error: string | null
          id: string
          normalized_queries: Json
          progress: string | null
          quantity: number
          raw_query: string
          status: string
          structured: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          normalized_queries?: Json
          progress?: string | null
          quantity?: number
          raw_query: string
          status?: string
          structured?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          normalized_queries?: Json
          progress?: string | null
          quantity?: number
          raw_query?: string
          status?: string
          structured?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
