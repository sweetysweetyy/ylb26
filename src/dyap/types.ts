// Dyap tables (dyap_*) — not in the shared generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Pres = { id: string; user_id: string; title: string; description: string | null; slide_data: Json; source_file_name: string | null; source_file_url: string | null; status: string; version: number; pdf_url: string | null; created_at: string; updated_at: string };
type Sett = { id: string; user_id: string; analysis_level: string; tone: string; language: string; theme: string; custom_colors: Json; created_at: string; updated_at: string };
type T<R, Req extends keyof R> = { Row: R; Insert: Partial<R> & Pick<R, Req>; Update: Partial<R>; Relationships: [] };
export type Database = { public: { Tables: { dyap_presentations: T<Pres, "user_id" | "title">; dyap_settings: T<Sett, "user_id"> }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
