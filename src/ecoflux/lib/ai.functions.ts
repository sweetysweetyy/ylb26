import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SHAPE_RULES = `Grammaire : action_type ∈ "operation" (action humaine), "decision" (contrôle/validation), "automated_agent" (automatisation logicielle ou agent IA), "event" (déclencheur).
color_code ∈ "value_add" (valeur ajoutée), "bottleneck" (goulot critique), "waiting_time" (attente/friction), "automated" (automatisation/agent).
Durées en minutes : cycle_time_minutes = temps de travail, wait_time_minutes = temps d'attente avant l'étape suivante. hourly_cost = coût horaire chargé en €.`;

const stepSchema = z.object({
  label: z.string(),
  action_type: z.enum(["operation", "decision", "automated_agent", "event"]),
  color_code: z.enum(["value_add", "bottleneck", "waiting_time", "automated"]),
  cycle_time_minutes: z.coerce.number(),
  wait_time_minutes: z.coerce.number().default(0),
  hourly_cost: z.coerce.number(),
  assigned_role: z.string().nullable().optional(),
  is_automated: z.boolean().default(false),
  tag: z.string().optional(),
  source_quote: z.string().optional(),
  explanation: z.string().optional(),
});
export type ClarifyStep = z.infer<typeof stepSchema>;
const clarifySchema = z.object({
  actors: z.array(z.object({ name: z.string(), role: z.string().optional(), hourly_rate_loaded: z.coerce.number(), department: z.string().optional() })),
  tools: z.array(z.object({ name: z.string(), category: z.string().optional(), monthly_cost: z.coerce.number(), is_silo: z.boolean().optional() })),
  cost_drivers: z.array(z.object({ driver_name: z.string(), unit: z.string().optional(), frequency: z.coerce.string().optional() })),
  rework_rate_percent: z.coerce.number(),
  annual_volume: z.coerce.number(),
  as_is: z.array(stepSchema),
  to_be: z.array(stepSchema),
});
export type ClarifyResult = z.infer<typeof clarifySchema>;

export const clarifyProcess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; rawInput: string; client: string }) =>
    z.object({ title: z.string().min(1), rawInput: z.string().min(10).max(12000), client: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { askModel, extractJson } = await import("./ai.server");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "ecoflux");
    const text = await askModel(model,
      `Tu es un ingénieur économique senior (TDABC, Théorie des contraintes, lean). Tu requalifies un processus décrit en langage naturel en paramètres économiques rigoureux, puis tu le reconstruis (To-Be) avec 4 leviers : centralisation des données, agents IA autonomes, automatisations intelligentes, synchronisation inter-équipes. ${SHAPE_RULES}
Réponds UNIQUEMENT par un objet JSON : {"actors":[{"name","role","hourly_rate_loaded","department"}],"tools":[{"name","category","monthly_cost","is_silo"}],"cost_drivers":[{"driver_name","unit","frequency"}],"rework_rate_percent":number,"annual_volume":number,"as_is":[étapes],"to_be":[étapes]}
Chaque étape : {"label" (court, ≤ 5 mots),"action_type","color_code","cycle_time_minutes","wait_time_minutes","hourly_cost","assigned_role","is_automated","tag" (ex "2 · Contrôle"),"source_quote","explanation"}. As-Is : "source_quote" = phrase ou extrait EXACT copié mot pour mot de la description terrain qui justifie l'étape ; "explanation" = 1-2 phrases sur ce que fait l'acteur et la friction constatée. To-Be : "source_quote" = "" ; "explanation" = 2-4 phrases fluides : pourquoi ce nœud existe, quelle étape As-Is il remplace ou transforme, le levier appliqué, le gain concret et le rôle de l'humain ou de l'agent. Commence chaque flux par un "event". 3 à 8 étapes par flux. Estime les valeurs manquantes de façon réaliste pour la France. Tout en français.`,
      `Client : ${data.client}\nProcessus : ${data.title}\n\nDescription terrain :\n${data.rawInput}`,
    );
    return clarifySchema.parse(extractJson(text));
  });

const ctxSchema = z.object({
  context: z.string().max(40000),
  history: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })).max(60),
  message: z.string().min(1).max(4000),
  focusRef: z.string().nullable(),
});

export type CopilotUpdate = {
  ref: string;
  label?: string;
  cycle_time_minutes?: number;
  wait_time_minutes?: number;
  hourly_cost?: number;
  is_automated?: boolean;
  color_code?: "value_add" | "bottleneck" | "waiting_time" | "automated";
  action_type?: "operation" | "decision" | "automated_agent" | "event";
  assigned_role?: string;
};

export const copilotReply = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof ctxSchema>) => ctxSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { askModel, extractJson } = await import("./ai.server");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "ecoflux");
    const hist = data.history.map((m) => `${m.role === "user" ? "CONSULTANT" : "COPILOTE"} : ${m.content}`).join("\n");
    const text = await askModel(model,
      `Tu es le copilote d'ingénierie économique d'un consultant en audit. Tu challenges, questionnes et affines la reconstruction To-Be du processus. Sois concis (≤ 120 mots), chiffré, concret, en français, sans jargon inutile. ${SHAPE_RULES}
Si la discussion justifie une modification du canvas To-Be, propose-la dans "updates" en utilisant la référence du nœud (ex "N3"). Réponds UNIQUEMENT en JSON : {"reply": string, "updates": [{"ref","label"?,"cycle_time_minutes"?,"wait_time_minutes"?,"hourly_cost"?,"is_automated"?,"color_code"?,"action_type"?,"assigned_role"?}]}`,
      `${data.context}\n\n${data.focusRef ? `Nœud sélectionné : ${data.focusRef}\n` : ""}Historique :\n${hist || "(vide)"}\n\nCONSULTANT : ${data.message}`,
    );
    try {
      const r = extractJson<{ reply: string; updates?: CopilotUpdate[] }>(text);
      return { reply: String(r.reply ?? ""), updates: Array.isArray(r.updates) ? r.updates : [] };
    } catch {
      return { reply: text.trim(), updates: [] as CopilotUpdate[] };
    }
  });

export type RoundUpAI = {
  executive_summary: string;
  velocity_market_gain: string;
  phases: { phase: number; title: string; steps: string[] }[];
  actions: { title: string; node_ref: string | null; exchange: number | null; citation: string; rule: string; owner: string; tools: string; confidence: number }[];
};

export const roundUpProcess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { context: string }) => z.object({ context: z.string().max(60000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { askModel, extractJson } = await import("./ai.server");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "ecoflux");
    const text = await askModel(model,
      `Tu es l'ingénieur économique qui produit "l'Ultime Solution" : un playbook d'implémentation directe, sans superflu, déployable dès demain. Tu compiles la saisie initiale, la clarification, le canvas As-Is/To-Be et TOUS les échanges du copilote. Chaque action doit être traçable : référence UNIQUE du nœud To-Be principal concerné (ex "N3", jamais plusieurs) et numéro d'échange du chat qui l'a motivée (ou null), avec la citation exacte de cet échange.
Réponds UNIQUEMENT en JSON : {"executive_summary": string (≤ 40 mots),"velocity_market_gain": string (≤ 20 mots),"phases":[{"phase":1,"title":"J+1 à J+7 · ...","steps":[string]},{"phase":2,"title":"J+8 à J+21 · ..."},{"phase":3,"title":"J+22 à J+35 · ..."}],"actions":[{"title" (≤ 6 mots, impératif),"node_ref","exchange","citation","rule" (commence par "Règle : "),"owner" ("Humain (...)", "Agent IA" ou "Système"),"tools","confidence" (0-100)}]} — 3 à 6 actions, ordonnées par ordre de mise en place. Français.`,
      data.context,
    );
    return extractJson<RoundUpAI>(text);
  });
