DO $$ BEGIN CREATE TYPE public.eco_action_type AS ENUM ('operation','decision','automated_agent','event'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.eco_color_code AS ENUM ('value_add','bottleneck','automated','waiting_time'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.eco_message_role AS ENUM ('user','assistant','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.eco_mission_status AS ENUM ('draft','clarifying','reengineering','round_up_ready','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.eco_handle_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.eco_clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT NOT NULL, industry TEXT, contact_email TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_processes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, client_id UUID NOT NULL REFERENCES public.eco_clients(id) ON DELETE CASCADE, title TEXT NOT NULL, reference TEXT, department TEXT, currency TEXT NOT NULL DEFAULT 'EUR', annual_volume NUMERIC NOT NULL DEFAULT 1200, raw_input TEXT, status public.eco_mission_status NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_clarifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), process_id UUID NOT NULL UNIQUE REFERENCES public.eco_processes(id) ON DELETE CASCADE, actors JSONB NOT NULL DEFAULT '[]', tools JSONB NOT NULL DEFAULT '[]', cost_drivers JSONB NOT NULL DEFAULT '[]', rework_rate_percent NUMERIC NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_skills (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_process_skills (process_id UUID NOT NULL REFERENCES public.eco_processes(id) ON DELETE CASCADE, skill_id UUID NOT NULL REFERENCES public.eco_skills(id) ON DELETE CASCADE, is_active BOOLEAN NOT NULL DEFAULT true, impact_weight NUMERIC DEFAULT 1, PRIMARY KEY (process_id, skill_id));
CREATE TABLE IF NOT EXISTS public.eco_process_nodes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), process_id UUID NOT NULL REFERENCES public.eco_processes(id) ON DELETE CASCADE, is_to_be BOOLEAN NOT NULL DEFAULT false, label TEXT NOT NULL, action_type public.eco_action_type NOT NULL DEFAULT 'operation', color_code public.eco_color_code NOT NULL DEFAULT 'value_add', confidence_score NUMERIC NOT NULL DEFAULT 100, cycle_time_minutes NUMERIC NOT NULL DEFAULT 0, wait_time_minutes NUMERIC NOT NULL DEFAULT 0, hourly_cost NUMERIC NOT NULL DEFAULT 0, assigned_role TEXT, is_automated BOOLEAN NOT NULL DEFAULT false, position_x NUMERIC NOT NULL DEFAULT 0, position_y NUMERIC NOT NULL DEFAULT 0, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_process_edges (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), process_id UUID NOT NULL REFERENCES public.eco_processes(id) ON DELETE CASCADE, source_node_id UUID NOT NULL REFERENCES public.eco_process_nodes(id) ON DELETE CASCADE, target_node_id UUID NOT NULL REFERENCES public.eco_process_nodes(id) ON DELETE CASCADE, label TEXT, condition TEXT, is_to_be BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_chat_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), process_id UUID NOT NULL REFERENCES public.eco_processes(id) ON DELETE CASCADE, node_id UUID REFERENCES public.eco_process_nodes(id) ON DELETE SET NULL, role public.eco_message_role NOT NULL, content TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.eco_round_up_solutions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), process_id UUID NOT NULL REFERENCES public.eco_processes(id) ON DELETE CASCADE, executive_summary TEXT NOT NULL DEFAULT '', velocity_market_gain TEXT, hard_cash_savings_annual NUMERIC NOT NULL DEFAULT 0, capacity_unlocked_hours_annual NUMERIC NOT NULL DEFAULT 0, capacity_revenue_potential NUMERIC NOT NULL DEFAULT 0, cycle_time_reduction_percent NUMERIC NOT NULL DEFAULT 0, implementation_cost NUMERIC NOT NULL DEFAULT 0, payback_days NUMERIC NOT NULL DEFAULT 0, phases JSONB NOT NULL DEFAULT '[]', decisions_traceability JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS eco_processes_client_idx ON public.eco_processes(client_id);
CREATE INDEX IF NOT EXISTS eco_nodes_process_idx ON public.eco_process_nodes(process_id);
CREATE INDEX IF NOT EXISTS eco_edges_process_idx ON public.eco_process_edges(process_id);
CREATE INDEX IF NOT EXISTS eco_msgs_process_idx ON public.eco_chat_messages(process_id);
CREATE INDEX IF NOT EXISTS eco_ru_process_idx ON public.eco_round_up_solutions(process_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eco_clients, public.eco_processes, public.eco_clarifications, public.eco_process_skills, public.eco_process_nodes, public.eco_process_edges, public.eco_chat_messages, public.eco_round_up_solutions TO authenticated;
GRANT SELECT ON public.eco_skills TO authenticated;
GRANT ALL ON public.eco_clients, public.eco_processes, public.eco_clarifications, public.eco_skills, public.eco_process_skills, public.eco_process_nodes, public.eco_process_edges, public.eco_chat_messages, public.eco_round_up_solutions TO service_role;

DROP TRIGGER IF EXISTS trg_eco_clients_updated_at ON public.eco_clients;
CREATE TRIGGER trg_eco_clients_updated_at BEFORE UPDATE ON public.eco_clients FOR EACH ROW EXECUTE FUNCTION public.eco_handle_updated_at();
DROP TRIGGER IF EXISTS trg_eco_processes_updated_at ON public.eco_processes;
CREATE TRIGGER trg_eco_processes_updated_at BEFORE UPDATE ON public.eco_processes FOR EACH ROW EXECUTE FUNCTION public.eco_handle_updated_at();
DROP TRIGGER IF EXISTS trg_eco_clarifications_updated_at ON public.eco_clarifications;
CREATE TRIGGER trg_eco_clarifications_updated_at BEFORE UPDATE ON public.eco_clarifications FOR EACH ROW EXECUTE FUNCTION public.eco_handle_updated_at();
DROP TRIGGER IF EXISTS trg_eco_process_nodes_updated_at ON public.eco_process_nodes;
CREATE TRIGGER trg_eco_process_nodes_updated_at BEFORE UPDATE ON public.eco_process_nodes FOR EACH ROW EXECUTE FUNCTION public.eco_handle_updated_at();

ALTER TABLE public.eco_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_process_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_process_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_process_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_round_up_solutions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.eco_owns_process(_pid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.eco_processes WHERE id = _pid AND user_id = auth.uid()) $$;
REVOKE EXECUTE ON FUNCTION public.eco_owns_process(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.eco_owns_process(uuid) TO authenticated;

DROP POLICY IF EXISTS eco_clients_owner ON public.eco_clients;
CREATE POLICY eco_clients_owner ON public.eco_clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS eco_processes_owner ON public.eco_processes;
CREATE POLICY eco_processes_owner ON public.eco_processes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.eco_clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS eco_skills_read ON public.eco_skills;
CREATE POLICY eco_skills_read ON public.eco_skills FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS eco_clar_owner ON public.eco_clarifications;
CREATE POLICY eco_clar_owner ON public.eco_clarifications FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));
DROP POLICY IF EXISTS eco_ps_owner ON public.eco_process_skills;
CREATE POLICY eco_ps_owner ON public.eco_process_skills FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));
DROP POLICY IF EXISTS eco_nodes_owner ON public.eco_process_nodes;
CREATE POLICY eco_nodes_owner ON public.eco_process_nodes FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));
DROP POLICY IF EXISTS eco_edges_owner ON public.eco_process_edges;
CREATE POLICY eco_edges_owner ON public.eco_process_edges FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));
DROP POLICY IF EXISTS eco_msgs_owner ON public.eco_chat_messages;
CREATE POLICY eco_msgs_owner ON public.eco_chat_messages FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));
DROP POLICY IF EXISTS eco_ru_owner ON public.eco_round_up_solutions;
CREATE POLICY eco_ru_owner ON public.eco_round_up_solutions FOR ALL TO authenticated USING (public.eco_owns_process(process_id)) WITH CHECK (public.eco_owns_process(process_id));

INSERT INTO public.eco_skills (code, name, category, description) VALUES
('DATA_CENTRAL','Centralisation des données','data','Une seule source de vérité : chaque information est saisie une fois, puis lue par tous les acteurs et outils.'),
('AI_AGENTS','Agents IA autonomes','ai_agents','Un agent cognitif traite les décisions répétitives (tri, contrôle, qualification) en continu, l''humain garde la validation des exceptions.'),
('AUTOMATION','Automatisations intelligentes','automation','Des règles déterministes déclenchées en temps réel exécutent les tâches mécaniques sans intervention.'),
('FLOW_SYNC','Synchronisation des flux','flow','Les passages de relais entre équipes sont synchronisés : chaque acteur reçoit le travail prêt, au bon moment.')
ON CONFLICT (code) DO NOTHING;