// Odoo Site Studio: types for its own ow_ tables only.
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProjectRow = {
  id: string; user_id: string; name: string; brief: Json; style: Json; plan: Json | null;
  status: string; progress: number; created_at: string; updated_at: string;
};
type LogRow = {
  id: string; user_id: string; project_id: string; level: string; message: string;
  detail: string | null; created_at: string;
};

export type Database = {
  public: {
    Tables: {
      ow_site_projects: { Row: ProjectRow; Insert: Partial<ProjectRow> & { user_id: string }; Update: Partial<ProjectRow>; Relationships: [] };
      ow_build_logs: { Row: LogRow; Insert: Partial<LogRow> & { user_id: string; project_id: string; message: string }; Update: Partial<LogRow>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
