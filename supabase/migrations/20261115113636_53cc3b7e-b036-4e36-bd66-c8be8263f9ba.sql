CREATE TABLE IF NOT EXISTS public.bp_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bp_settings TO authenticated;
GRANT ALL ON public.bp_settings TO service_role;
ALTER TABLE public.bp_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bp_settings_owner_all ON public.bp_settings;
CREATE POLICY bp_settings_owner_all ON public.bp_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS bp_settings_updated_at ON public.bp_settings;
CREATE TRIGGER bp_settings_updated_at BEFORE UPDATE ON public.bp_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();