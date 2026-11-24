ALTER FUNCTION public.angelo_init_user(uuid) SET search_path = public;
ALTER FUNCTION public.noject_recompute_project_progress(uuid) SET search_path = public;

DROP POLICY IF EXISTS "p_all_mm_cron_tokens" ON public.mm_cron_tokens;
REVOKE ALL ON public.mm_cron_tokens FROM anon, authenticated;
DROP POLICY IF EXISTS "p_all_mm_tick_logs" ON public.mm_tick_logs;
DROP POLICY IF EXISTS "Authenticated users can read tick logs" ON public.mm_tick_logs;
REVOKE ALL ON public.mm_tick_logs FROM anon, authenticated;

DROP POLICY IF EXISTS "storage_auth_write_backgrounds" ON storage.objects;
CREATE POLICY "storage_owner_write_backgrounds" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (select auth.uid()::text));
DROP POLICY IF EXISTS "storage_auth_write_skyvente_logos" ON storage.objects;
CREATE POLICY "storage_owner_write_skyvente_logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'skyvente-logos' AND (storage.foldername(name))[1] = (select auth.uid()::text))
  WITH CHECK (bucket_id = 'skyvente-logos' AND (storage.foldername(name))[1] = (select auth.uid()::text));