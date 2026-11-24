// FacturOdoo tables only (fo_invoices) plus the shared Laboratory odoo_connections row.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      fo_invoices: {
        Row: { id: string; user_id: string; file_name: string; storage_path: string; status: string; extracted: Json | null; supplier_match: Json | null; odoo_partner_id: number | null; odoo_partner_created: boolean; odoo_move_id: number | null; odoo_move_name: string | null; odoo_purchase_id: number | null; odoo_purchase_name: string | null; error_message: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; file_name: string; storage_path?: string; status?: string; extracted?: Json | null; supplier_match?: Json | null; odoo_partner_id?: number | null; odoo_partner_created?: boolean; odoo_move_id?: number | null; odoo_move_name?: string | null; odoo_purchase_id?: number | null; odoo_purchase_name?: string | null; error_message?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; file_name?: string; storage_path?: string; status?: string; extracted?: Json | null; supplier_match?: Json | null; odoo_partner_id?: number | null; odoo_partner_created?: boolean; odoo_move_id?: number | null; odoo_move_name?: string | null; odoo_purchase_id?: number | null; odoo_purchase_name?: string | null; error_message?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      odoo_connections: {
        Row: { api_key: string; db: string; last_tested_at: string | null; modules: Json; status: string; status_message: string | null; uid: number | null; updated_at: string; url: string; user_id: string; username: string };
        Insert: { api_key: string; db: string; last_tested_at?: string | null; modules?: Json; status?: string; status_message?: string | null; uid?: number | null; updated_at?: string; url: string; user_id?: string; username: string };
        Update: { api_key?: string; db?: string; last_tested_at?: string | null; modules?: Json; status?: string; status_message?: string | null; uid?: number | null; updated_at?: string; url?: string; user_id?: string; username?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
