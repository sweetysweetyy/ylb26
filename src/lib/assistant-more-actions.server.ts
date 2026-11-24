import { z } from "zod";
import type { Action } from "./assistant-apps.server";

/* Generic read/create actions for the imported apps (every table here has user_id, so scopedClient works). */
const list = (label: string, table: string, cols: string, open: string): Action => ({
  description: `Lire les ${label} récents (filtre texte facultatif).`,
  input: z.object({ recherche: z.string().optional(), limite: z.number().int().min(1).max(50).optional() }),
  run: async ({ db, userId }, i) => {
    const { data, error } = await db.from(table).select(cols).eq("user_id", userId).order("created_at", { ascending: false }).limit(i.limite ?? 20);
    if (error) throw new Error(error.message);
    const q = (i.recherche ?? "").toLowerCase();
    return { items: q ? (data ?? []).filter((r: unknown) => JSON.stringify(r).toLowerCase().includes(q)) : data, open };
  },
});
const create = (label: string, table: string, input: z.ZodObject<any>, open: string, extra: Record<string, unknown> = {}): Action => ({
  description: `Créer réellement ${label}.`,
  input,
  run: async ({ db, userId }, i) => {
    const { data, error } = await db.from(table).insert({ user_id: userId, ...extra, ...i }).select("id").single();
    if (error) throw new Error(error.message);
    return { ...data, open };
  },
});
const s = z.string();
const o = () => z.string().optional();

export const moreActions: Record<string, Record<string, Action>> = {
  crm: {
    lire_opportunites: list("opportunités CRM", "crm_opportunities", "id,name,company,stage,value_amount,probability,expected_close_date,contact_name,contact_email", "/crm"),
    creer_opportunite: create("une opportunité / lead CRM", "crm_opportunities", z.object({ name: s, company: o(), description: o(), contact_name: o(), contact_email: o(), contact_phone: o(), value_amount: z.number().optional(), stage: o() }), "/crm"),
    lire_contacts: list("contacts CRM", "crm_contacts", "id,name,email,phone,role,opportunity_id", "/crm"),
    creer_contact: create("un contact CRM", "crm_contacts", z.object({ name: s, email: o(), phone: o(), role: o(), notes: o(), opportunity_id: o() }), "/crm"),
  },
  noject: {
    lire_projets: list("projets Noject", "noject_projects", "id,name,description,status,phase,progress,start_date,end_date", "/noject"),
    creer_projet: create("un projet Noject", "noject_projects", z.object({ name: s, description: o(), objective: o(), start_date: o(), end_date: o() }), "/noject"),
    lire_taches: list("tâches Noject", "noject_tasks", "id,project_id,title,status,priority,due_date", "/noject"),
    creer_tache: create("une tâche dans un projet Noject (project_id requis)", "noject_tasks", z.object({ project_id: s, title: s, description: o(), due_date: o() }), "/noject"),
  },
  skyvente: {
    lire_documents: list("devis/commandes/factures Sky Vente", "sv_documents", "id,type,number,title,status,client,total_ttc,issue_date,due_date", "/skyvente"),
    lire_clients: list("clients Sky Vente", "sv_contacts", "id,kind,first_name,last_name,company,email,phone,city", "/skyvente"),
    creer_client: create("un client Sky Vente", "sv_contacts", z.object({ company: o(), first_name: o(), last_name: o(), email: o(), phone: o(), city: o(), notes: o() }), "/skyvente"),
  },
  facturodoo: { lire_factures: list("factures fournisseurs FacturOdoo", "fo_invoices", "id,file_name,status,odoo_move_name,error_message", "/facturodoo") },
  caisse: {
    lire_ventes: list("ventes de la Caisse Vocale", "cv_sales", "id,product_name,customer_name,amount,created_at", "/caisse"),
    enregistrer_vente: create("une vente en caisse", "cv_sales", z.object({ product_name: s, customer_name: o(), amount: z.number() }), "/caisse"),
  },
  prospect: { lire_entreprises: list("entreprises prospectées (OLLY)", "pe_companies", "id,name,sector,city,website,email,relevance_score", "/prospect") },
  pascal: {
    lire_prospects: list("prospects de Pascal", "psc_prospects", "id,email,full_name,company,status,next_action_at", "/pascal"),
    ajouter_prospect: create("un prospect pour Pascal", "psc_prospects", z.object({ email: s, full_name: o(), company: o(), context: o() }), "/pascal"),
  },
  kooky: { lire_leads: list("leads KOOKY", "ky_leads", "id,company_name,city,sector,email,phone,score,status", "/kooky") },
  planagenda: {
    lire_planning: list("éléments PlanAgenda", "pa_planning_items", "id,kind,title,start_at,end_at,due_at,status,priority", "/planning"),
    creer_element: create("un élément PlanAgenda (start_at/end_at ISO)", "pa_planning_items", z.object({ title: s, description: o(), start_at: o(), end_at: o(), due_at: o() }), "/planning"),
  },
  feeloo: {
    lire_candidats: list("candidats Feeloo", "fl_candidates", "id,full_name,email,headline,location,status,rating", "/feeloo"),
    creer_candidat: create("un candidat Feeloo", "fl_candidates", z.object({ full_name: s, email: o(), phone: o(), headline: o(), summary: o() }), "/feeloo"),
    lire_postes: list("offres d'emploi Feeloo", "fl_jobs", "id,title,company,location,status", "/feeloo"),
    creer_poste: create("une offre d'emploi Feeloo", "fl_jobs", z.object({ title: s, company: o(), location: o(), description: o() }), "/feeloo"),
  },
  nexusjob: { lire_offres: list("offres NexusJob", "nxj_offers", "id,title,company,location,score,status,url", "/nexusjob") },
  cml: {
    lire_posts: list("posts LinkedIn Holo CM", "cml_posts", "id,title,content,status,scheduled_at,published_at", "/cml"),
    creer_brouillon: create("un brouillon de post LinkedIn", "cml_posts", z.object({ content: s, title: o(), scheduled_at: o() }), "/cml"),
    creer_idee: create("une idée de post LinkedIn", "cml_ideas", z.object({ title: s, angle: o(), hook: o() }), "/cml"),
  },
  coussel: {
    lire_carrousels: list("carrousels Coussel", "csl_carousels", "id,topic,title,status", "/coussel"),
    creer_carrousel: create("un carrousel Coussel (brouillon)", "csl_carousels", z.object({ topic: s, title: o(), idea: o() }), "/coussel"),
  },
  dyap: { lire_presentations: list("présentations Dyap", "dyap_presentations", "id,title,description,status,version", "/dyap") },
  studioproduit: { lire_visuels: list("visuels Studio Produit", "sp_assets", "id,name,category,public_url", "/studioproduit") },
  pageweaver: { lire_pages: list("projets Page Weaver", "pw_projects", "id,name,brief", "/pageweaver") },
  odooweb: { lire_sites: list("projets de site Odoo Web", "ow_site_projects", "id,name,brief,status,progress", "/odooweb") },
  businessplan: { lire_plans: list("business plans", "bp_plans", "id,title,status,updated_at", "/businessplan") },
  financierplan: {
    lire_projets: list("projets FinancierPlan", "fp_projects", "id,name,idea,sector,status,progress", "/financierplan"),
    creer_projet: create("un projet FinancierPlan", "fp_projects", z.object({ name: s, idea: o(), sector: o(), location: o() }), "/financierplan"),
  },
  etudedemarche: {
    lire_etudes: list("études de marché", "edm_studies", "id,title,brief,status,progress", "/etudedemarche"),
    creer_etude: create("une étude de marché (brouillon)", "edm_studies", z.object({ brief: s, title: o() }), "/etudedemarche"),
  },
  immo: {
    lire_biens: list("biens AtelierImmo", "immo_properties", "id,title,city,property_type,transaction,surface,rooms,price,published", "/immo"),
    creer_bien: create("un bien immobilier", "immo_properties", z.object({ title: o(), city: o(), property_type: o(), transaction: o(), surface: z.number().optional(), rooms: z.number().optional(), price: z.number().optional(), description: o() }), "/immo"),
  },
  chytect: { lire_projets: list("projets Chytect", "chyt_projects", "id,name,created_at", "/chytect") },
  ecoflux: { lire_processus: list("processus Ecoflux", "eco_processes", "id,title,reference,department,status", "/ecoflux") },
  tep: { lire_tableaux: list("tableaux TEP", "tep_projects", "id,title,board_type", "/tep") },
};
