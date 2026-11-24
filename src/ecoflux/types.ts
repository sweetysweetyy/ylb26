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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      eco_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          node_id: string | null
          process_id: string
          role: Database["public"]["Enums"]["eco_message_role"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          node_id?: string | null
          process_id: string
          role: Database["public"]["Enums"]["eco_message_role"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          node_id?: string | null
          process_id?: string
          role?: Database["public"]["Enums"]["eco_message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_clarifications: {
        Row: {
          actors: Json
          cost_drivers: Json
          created_at: string
          id: string
          process_id: string
          rework_rate_percent: number
          tools: Json
          updated_at: string
        }
        Insert: {
          actors?: Json
          cost_drivers?: Json
          created_at?: string
          id?: string
          process_id: string
          rework_rate_percent?: number
          tools?: Json
          updated_at?: string
        }
        Update: {
          actors?: Json
          cost_drivers?: Json
          created_at?: string
          id?: string
          process_id?: string
          rework_rate_percent?: number
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarifications_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_clients: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eco_process_edges: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          is_to_be: boolean
          label: string | null
          process_id: string
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          is_to_be?: boolean
          label?: string | null
          process_id: string
          source_node_id: string
          target_node_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          is_to_be?: boolean
          label?: string | null
          process_id?: string
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_edges_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_process_nodes: {
        Row: {
          action_type: Database["public"]["Enums"]["eco_action_type"]
          assigned_role: string | null
          color_code: Database["public"]["Enums"]["eco_color_code"]
          confidence_score: number
          created_at: string
          cycle_time_minutes: number
          hourly_cost: number
          id: string
          is_automated: boolean
          is_to_be: boolean
          label: string
          metadata: Json
          position_x: number
          position_y: number
          process_id: string
          updated_at: string
          wait_time_minutes: number
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["eco_action_type"]
          assigned_role?: string | null
          color_code?: Database["public"]["Enums"]["eco_color_code"]
          confidence_score?: number
          created_at?: string
          cycle_time_minutes?: number
          hourly_cost?: number
          id?: string
          is_automated?: boolean
          is_to_be?: boolean
          label: string
          metadata?: Json
          position_x?: number
          position_y?: number
          process_id: string
          updated_at?: string
          wait_time_minutes?: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["eco_action_type"]
          assigned_role?: string | null
          color_code?: Database["public"]["Enums"]["eco_color_code"]
          confidence_score?: number
          created_at?: string
          cycle_time_minutes?: number
          hourly_cost?: number
          id?: string
          is_automated?: boolean
          is_to_be?: boolean
          label?: string
          metadata?: Json
          position_x?: number
          position_y?: number
          process_id?: string
          updated_at?: string
          wait_time_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_nodes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_process_skills: {
        Row: {
          impact_weight: number | null
          is_active: boolean
          process_id: string
          skill_id: string
        }
        Insert: {
          impact_weight?: number | null
          is_active?: boolean
          process_id: string
          skill_id: string
        }
        Update: {
          impact_weight?: number | null
          is_active?: boolean
          process_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_skills_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "eco_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_processes: {
        Row: {
          annual_volume: number
          client_id: string
          created_at: string
          currency: string
          department: string | null
          id: string
          raw_input: string | null
          reference: string | null
          status: Database["public"]["Enums"]["eco_mission_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_volume?: number
          client_id: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          raw_input?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["eco_mission_status"]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          annual_volume?: number
          client_id?: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          raw_input?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["eco_mission_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "eco_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_round_up_solutions: {
        Row: {
          capacity_revenue_potential: number
          capacity_unlocked_hours_annual: number
          created_at: string
          cycle_time_reduction_percent: number
          decisions_traceability: Json
          executive_summary: string
          hard_cash_savings_annual: number
          id: string
          implementation_cost: number
          payback_days: number
          phases: Json
          process_id: string
          velocity_market_gain: string | null
        }
        Insert: {
          capacity_revenue_potential?: number
          capacity_unlocked_hours_annual?: number
          created_at?: string
          cycle_time_reduction_percent?: number
          decisions_traceability?: Json
          executive_summary: string
          hard_cash_savings_annual?: number
          id?: string
          implementation_cost?: number
          payback_days?: number
          phases?: Json
          process_id: string
          velocity_market_gain?: string | null
        }
        Update: {
          capacity_revenue_potential?: number
          capacity_unlocked_hours_annual?: number
          created_at?: string
          cycle_time_reduction_percent?: number
          decisions_traceability?: Json
          executive_summary?: string
          hard_cash_savings_annual?: number
          id?: string
          implementation_cost?: number
          payback_days?: number
          phases?: Json
          process_id?: string
          velocity_market_gain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_up_solutions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_skills: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
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
      eco_action_type: "operation" | "decision" | "automated_agent" | "event"
      eco_color_code: "value_add" | "bottleneck" | "automated" | "waiting_time"
      eco_message_role: "user" | "assistant" | "system"
      eco_mission_status:
        | "draft"
        | "clarifying"
        | "reengineering"
        | "round_up_ready"
        | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      eco_action_type: ["operation", "decision", "automated_agent", "event"],
      eco_color_code: ["value_add", "bottleneck", "automated", "waiting_time"],
      eco_message_role: ["user", "assistant", "system"],
      eco_mission_status: [
        "draft",
        "clarifying",
        "reengineering",
        "round_up_ready",
        "completed",
      ],
    },
  },
} as const
