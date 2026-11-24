ALTER TABLE public.sv_documents ADD COLUMN IF NOT EXISTS accounting_entry_id uuid;
ALTER TABLE public.sa_documents ADD COLUMN IF NOT EXISTS accounting_entry_id uuid;
CREATE INDEX IF NOT EXISTS skc_entries_source_idx ON public.skc_accounting_entries (source_type, source_id);