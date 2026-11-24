// Caisse Vocale: types for its own cv_ tables only.
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type StateRow = { user_id: string; config_id: number | null; session_id: number | null; updated_at: string };
type MsgRow = { id: string; user_id: string; role: string; content: string; data: Json | null; created_at: string };
type SaleRow = { id: string; user_id: string; odoo_order_id: number | null; product_name: string; customer_name: string | null; amount: number; created_at: string };
export type Database = {
  public: {
    Tables: {
      cv_session_state: { Row: StateRow; Insert: Partial<StateRow> & { user_id: string }; Update: Partial<StateRow>; Relationships: [] };
      cv_messages: { Row: MsgRow; Insert: Partial<MsgRow> & { user_id: string; role: string; content: string }; Update: Partial<MsgRow>; Relationships: [] };
      cv_sales: { Row: SaleRow; Insert: Partial<SaleRow> & { user_id: string; product_name: string }; Update: Partial<SaleRow>; Relationships: [] };
    };
    Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
  };
};
