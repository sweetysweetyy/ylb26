// Pulse tables only (pls_) plus the shared Laboratory odoo_connections row.
type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];
type T<R, I> = { Row: R; Insert: I; Update: Partial<I>; Relationships: [] };
type Snap = { id: string; user_id: string; source: string; data: Json; created_at: string };
type Msg = { id: string; user_id: string; role: string; content: string; highlights: Json; created_at: string };
export type Database = {
  public: {
    Tables: {
      pls_kpi_snapshots: T<Snap, { id?: string; user_id: string; source?: string; data: Json; created_at?: string }>;
      pls_chat_messages: T<Msg, { id?: string; user_id: string; role: string; content: string; highlights?: Json; created_at?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
