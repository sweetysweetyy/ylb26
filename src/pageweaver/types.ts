// Page Weaver tables only (pw_ prefix).
import type { Json } from "@/integrations/supabase/types";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      pw_projects: {
        Row: {
          brief: string
          created_at: string
          design: Json
          id: string
          name: string
          page_html: string | null
          page_x: number
          page_y: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: string
          created_at?: string
          design?: Json
          id?: string
          name?: string
          page_html?: string | null
          page_x?: number
          page_y?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          brief?: string
          created_at?: string
          design?: Json
          id?: string
          name?: string
          page_html?: string | null
          page_x?: number
          page_y?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pw_sections: {
        Row: {
          annotations: Json
          config: Json
          created_at: string
          description: string
          html: string | null
          id: string
          in_page: boolean
          page_order: number
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          annotations?: Json
          config?: Json
          created_at?: string
          description?: string
          html?: string | null
          id?: string
          in_page?: boolean
          page_order?: number
          project_id: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Update: {
          annotations?: Json
          config?: Json
          created_at?: string
          description?: string
          html?: string | null
          id?: string
          in_page?: boolean
          page_order?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
