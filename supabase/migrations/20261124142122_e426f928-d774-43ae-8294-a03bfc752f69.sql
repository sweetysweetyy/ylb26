DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.noject_recompute_project_progress(uuid)'::regprocedure) INTO definition;
  definition := replace(definition, E'BEGIN\n', E'BEGIN\n  IF coalesce(auth.role(), '''') <> ''service_role'' AND NOT EXISTS (SELECT 1 FROM public.noject_projects WHERE id = _project_id AND user_id = auth.uid()) THEN\n    RAISE EXCEPTION ''Project access denied'' USING ERRCODE = ''42501'';\n  END IF;\n');
  EXECUTE definition;
  SELECT pg_get_functiondef('public.skc_init_company_defaults(uuid)'::regprocedure) INTO definition;
  definition := replace(definition, E'BEGIN\n', E'BEGIN\n  IF coalesce(auth.role(), '''') <> ''service_role'' AND NOT (public.skc_has_company_role(p_company_id, ARRAY[''owner'']) OR public.skc_is_company_creator(p_company_id)) THEN\n    RAISE EXCEPTION ''Company access denied'' USING ERRCODE = ''42501'';\n  END IF;\n');
  EXECUTE definition;
END;
$migration$;