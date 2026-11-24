// KOOKY tables only (ky_) plus the shared Laboratory odoo_connections row.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      ky_lead_searches: {
        Row: {
          brief: string | null
          created_at: string
          error: string | null
          id: string
          location: string | null
          sector: string
          status: string
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: string | null
          created_at?: string
          error?: string | null
          id?: string
          location?: string | null
          sector: string
          status?: string
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          brief?: string | null
          created_at?: string
          error?: string | null
          id?: string
          location?: string | null
          sector?: string
          status?: string
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ky_leads: {
        Row: {
          analysis: string | null
          approach: string | null
          city: string | null
          company_name: string
          company_size: string | null
          contacts: Json
          country: string | null
          created_at: string
          email: string | null
          error: string | null
          id: string
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          phone: string | null
          position: number
          score: number | null
          search_id: string
          sector: string | null
          sources: Json
          status: string
          street: string | null
          summary: string | null
          updated_at: string
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          analysis?: string | null
          approach?: string | null
          city?: string | null
          company_name: string
          company_size?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          phone?: string | null
          position?: number
          score?: number | null
          search_id: string
          sector?: string | null
          sources?: Json
          status?: string
          street?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          analysis?: string | null
          approach?: string | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          phone?: string | null
          position?: number
          score?: number | null
          search_id?: string
          sector?: string | null
          sources?: Json
          status?: string
          street?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "ky_lead_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_connections: {
        Row: { api_key: string; db: string; last_tested_at: string | null; modules: Json; status: string; status_message: string | null; uid: number | null; updated_at: string; url: string; user_id: string; username: string }
        Insert: { api_key: string; db: string; last_tested_at?: string | null; modules?: Json; status?: string; status_message?: string | null; uid?: number | null; updated_at?: string; url: string; user_id: string; username: string }
        Update: { api_key?: string; db?: string; last_tested_at?: string | null; modules?: Json; status?: string; status_message?: string | null; uid?: number | null; updated_at?: string; url?: string; user_id?: string; username?: string }
        Relationships: []
      }
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type OdooRow = Database["public"]["Tables"]["odoo_connections"]["Row"];

/** KOOKY's view of the shared Laboratory Odoo connection (original field names kept for the UI). */
export type KyConn = {
  url: string;
  db_name: string;
  login: string;
  api_key: string;
  odoo_uid: number | null;
  odoo_version: string | null;
  status: string;
  last_error: string | null;
  last_checked_at: string | null;
};

export function toKyConn(r: OdooRow | null | undefined): KyConn | null {
  if (!r) return null;
  const mods = (r.modules ?? {}) as { kooky_version?: string };
  return {
    url: r.url,
    db_name: r.db,
    login: r.username,
    api_key: r.api_key,
    odoo_uid: r.uid,
    odoo_version: mods.kooky_version ?? null,
    status: r.status === "connected" ? "ok" : r.status,
    last_error: r.status_message,
    last_checked_at: r.last_tested_at,
  };
}
