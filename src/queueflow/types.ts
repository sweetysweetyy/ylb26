// Queue Flow tables (qf_*) — not in the shared generated types.
type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
export type QfQueue = { id: string; owner_id: string; business_name: string; name: string; slug: string; is_active: boolean; created_at: string };
export type QfEntry = { id: string; queue_id: string; full_name: string; phone: string; email: string | null; reason: string | null; status: string; ticket_number: number; sort_order: number; created_at: string; served_at: string | null };
export type Database = { public: { Tables: { qf_queues: Row<QfQueue>; qf_queue_entries: Row<QfEntry> }; Views: {}; Functions: {}; Enums: {}; CompositeTypes: {} } };
