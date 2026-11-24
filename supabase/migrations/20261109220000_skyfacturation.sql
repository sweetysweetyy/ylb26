-- Sky Facturation : passerelle Odoo / Peppol (préfixe sf_)
CREATE TABLE IF NOT EXISTS public.sf_transmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_app text NOT NULL CHECK (source_app IN ('skyvente','skyachat','odoo')),
  source_doc_id uuid,
  source_doc_ref text NOT NULL DEFAULT '',
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','synced_odoo','peppol_sent','peppol_delivered','imported','error','cancelled')),
  odoo_move_id integer,
  odoo_name text,
  payload_preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  peppol_status text,
  peppol_message_id text,
  error_log text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sf_transmissions TO authenticated;
GRANT ALL ON public.sf_transmissions TO service_role;
CREATE INDEX IF NOT EXISTS sf_transmissions_user_idx ON public.sf_transmissions(user_id);
CREATE INDEX IF NOT EXISTS sf_transmissions_doc_idx ON public.sf_transmissions(source_doc_id);
ALTER TABLE public.sf_transmissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sf_transmissions_own" ON public.sf_transmissions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.sf_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_sync_peppol boolean NOT NULL DEFAULT true,
  require_siret_validation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sf_settings TO authenticated;
GRANT ALL ON public.sf_settings TO service_role;
ALTER TABLE public.sf_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sf_settings_own" ON public.sf_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
