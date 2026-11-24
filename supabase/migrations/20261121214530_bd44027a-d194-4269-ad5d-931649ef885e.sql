CREATE SCHEMA IF NOT EXISTS eco_private;
REVOKE ALL ON SCHEMA eco_private FROM public, anon;
GRANT USAGE ON SCHEMA eco_private TO authenticated;
CREATE OR REPLACE FUNCTION eco_private.owns_process(_pid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.eco_processes WHERE id = _pid AND user_id = auth.uid()) $$;
REVOKE EXECUTE ON FUNCTION eco_private.owns_process(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION eco_private.owns_process(uuid) TO authenticated;

DROP POLICY IF EXISTS eco_clar_owner ON public.eco_clarifications;
CREATE POLICY eco_clar_owner ON public.eco_clarifications FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP POLICY IF EXISTS eco_ps_owner ON public.eco_process_skills;
CREATE POLICY eco_ps_owner ON public.eco_process_skills FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP POLICY IF EXISTS eco_nodes_owner ON public.eco_process_nodes;
CREATE POLICY eco_nodes_owner ON public.eco_process_nodes FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP POLICY IF EXISTS eco_edges_owner ON public.eco_process_edges;
CREATE POLICY eco_edges_owner ON public.eco_process_edges FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP POLICY IF EXISTS eco_msgs_owner ON public.eco_chat_messages;
CREATE POLICY eco_msgs_owner ON public.eco_chat_messages FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP POLICY IF EXISTS eco_ru_owner ON public.eco_round_up_solutions;
CREATE POLICY eco_ru_owner ON public.eco_round_up_solutions FOR ALL TO authenticated USING (eco_private.owns_process(process_id)) WITH CHECK (eco_private.owns_process(process_id));
DROP FUNCTION IF EXISTS public.eco_owns_process(uuid);

CREATE INDEX IF NOT EXISTS eco_msgs_node_idx ON public.eco_chat_messages(node_id);
CREATE INDEX IF NOT EXISTS eco_clients_user_idx ON public.eco_clients(user_id);
CREATE INDEX IF NOT EXISTS eco_edges_src_idx ON public.eco_process_edges(source_node_id);
CREATE INDEX IF NOT EXISTS eco_edges_tgt_idx ON public.eco_process_edges(target_node_id);
CREATE INDEX IF NOT EXISTS eco_ps_skill_idx ON public.eco_process_skills(skill_id);
CREATE INDEX IF NOT EXISTS eco_processes_user_idx ON public.eco_processes(user_id);