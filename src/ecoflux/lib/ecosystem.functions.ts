import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  context: z.string().max(40000),
  steps: z.array(z.object({ ref: z.string(), label: z.string(), explanation: z.string().optional(), automated: z.boolean() })).max(40),
  apps: z.array(z.object({ key: z.string(), name: z.string(), description: z.string() })).max(120),
  connections: z.object({ odoo: z.boolean(), google: z.boolean() }),
});
const str = z.coerce.string().default("");
const list = z.array(z.coerce.string()).default([]);
const outSchema = z.object({
  summary: str,
  assignments: z.array(z.object({
    node_ref: z.string(), app_key: z.string().nullable().default(null), reason: str, gain: str,
    requires: z.array(z.enum(["odoo", "google"])).catch([]).default([]),
    effort: z.enum(["faible", "moyen", "élevé"]).catch("moyen"), impact: z.enum(["faible", "moyen", "fort"]).catch("moyen"),
    mission: str,
    new_app: z.object({ name: str, mission: str, inputs: list, outputs: list, prefix: str, tables: list, routes: list, ai: str, gain: str, prompt: str }).nullable().optional(),
  })).default([]),
  flows: z.array(z.object({ from: z.string(), to: z.string(), data: str })).default([]),
  phases: z.array(z.object({ title: str, app_keys: list })).default([]),
});

export const designEcosystem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { askModel, extractJson } = await import("./ai.server");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "ecoflux");
    const keys = new Set(data.apps.map((a) => a.key));
    const text = await askModel(model,
      `Tu es architecte d'ingénierie économique. Tu organises le processus cible (To-Be) d'une entreprise UNIQUEMENT avec les applications du Laboratoire listées ci-dessous, en expliquant concrètement le choix de chaque app pour chaque étape.
Catalogue (clé — nom — rôle) :
${data.apps.map((a) => `${a.key} — ${a.name} — ${a.description}`).join("\n")}
Connexions déjà actives : Odoo ${data.connections.odoo ? "oui" : "non"}, Google ${data.connections.google ? "oui" : "non"}.
Règles :
- Pour chaque étape To-Be (hors simple déclencheur si aucune app n'est utile), choisis l'app la plus pertinente (app_key = clé exacte du catalogue). "reason" = 2-3 phrases : la friction éliminée et pourquoi cette app précisément. "gain" = gain concret chiffré si possible. "requires" = ["odoo"] et/ou ["google"] si l'app s'appuie sur ces connexions. "effort" ∈ faible|moyen|élevé, "impact" ∈ faible|moyen|fort. "mission" = consigne courte pour un agent Smart Teams si l'étape est confiée à un agent IA, sinon "".
- Si AUCUNE app du catalogue ne couvre réellement le besoin, app_key = null et remplis "new_app" : {"name" (nom court de marque),"mission","inputs":[],"outputs":[],"prefix" (préfixe de tables unique, ex "ts_"),"tables":["ts_xxx (champs clés)"],"routes":["/nom/..."],"ai" (usage de l'IA),"gain","prompt" (cahier des charges complet, prêt à coller pour générer l'app : objectif, écrans, tables préfixées avec RLS par utilisateur, routes sous /nom/*, styles isolés sous .nom-theme, IA via le modèle choisi de l'app, intégrations Odoo/Google partagées si utiles)}. N'invente pas d'app si une app existante convient.
- "flows" = passages de données entre apps retenues : {"from": clé ou "new:Nom","to": clé ou "new:Nom","data"}.
- "phases" = 2 à 4 phases d'adoption progressive (quick wins d'abord) : {"title","app_keys":[clés ou "new:Nom"]}.
- "summary" = 2-3 phrases sur l'architecture applicative retenue.
Réponds UNIQUEMENT par un objet JSON {"summary","assignments":[{"node_ref","app_key","reason","gain","requires","effort","impact","mission","new_app"}],"flows","phases"}. Tout en français.`,
      `Étapes To-Be :\n${data.steps.map((s) => `${s.ref} · ${s.label}${s.automated ? " (automatisée)" : ""} — ${s.explanation ?? ""}`).join("\n")}\n\nContexte du dossier :\n${data.context}`,
    );
    const out = outSchema.parse(extractJson(text));
    const refs = new Set(data.steps.map((s) => s.ref));
    return {
      ...out,
      assignments: out.assignments.filter((a) => refs.has(a.node_ref)).map((a) => {
        const valid = a.app_key && keys.has(a.app_key) ? a.app_key : null;
        return { ...a, app_key: valid, new_app: valid ? null : a.new_app ?? { name: "Nouvelle app", mission: a.reason, inputs: [], outputs: [], prefix: "", tables: [], routes: [], ai: "", gain: a.gain, prompt: a.reason } };
      }),
      generated_at: new Date().toISOString(),
    };
  });

const evidenceIn = z.object({ kind: z.enum(["declared", "estimated"]).catch("estimated"), quote: str, reason: str });
const refineOut = z.object({
  reply: str,
  ecosystem: outSchema,
  metric_updates: z.array(z.object({ ref: z.string(), field: z.enum(["cycle_time_minutes", "wait_time_minutes", "hourly_cost"]), value: z.coerce.number(), evidence: evidenceIn })).catch([]).default([]),
  parameter_updates: z.array(z.object({ field: z.enum(["annual_volume", "rework_rate_percent", "monthly_licences_before", "monthly_licences_after", "revenue_per_freed_hour", "latency_cost_per_hour", "implementation_cost"]), value: z.coerce.number(), evidence: evidenceIn })).catch([]).default([]),
});
const refineInput = inputSchema.extend({ processId: z.string().uuid(), message: z.string().trim().min(1).max(4000) });

export const refineEcosystem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof refineInput>) => refineInput.parse(d))
  .handler(async ({ data, context }) => {
    const { askModel, extractJson } = await import("./ai.server");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const { mergeOverrides, validateEvidence } = await import("./economics");
    type Eco = import("./ecosystem").LabEcosystem;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("eco_processes").select("lab_ecosystem").eq("id", data.processId).single();
    if (error || !row) throw new Error("Dossier introuvable.");
    const current = (row.lab_ecosystem ?? null) as Eco | null;
    const history = current?.conversation ?? [];
    const textOf = (m: { parts?: { type: string; text?: string }[] }) => (m.parts ?? []).map((p) => p.text ?? "").join("");
    const model = await resolveAppAiModel(context.supabase, context.userId, "ecoflux");
    const keys = new Set(data.apps.map((a) => a.key));
    const text = await askModel(model,
      `Tu es architecte d'ingénierie économique. Tu fais évoluer l'écosystème applicatif du Laboratoire selon la demande de l'utilisateur.
Catalogue interne (clé — nom — rôle) :
${data.apps.map((a) => `${a.key} — ${a.name} — ${a.description}`).join("\n")}
Connexions actives : Odoo ${data.connections.odoo ? "oui" : "non"}, Google ${data.connections.google ? "oui" : "non"}.
Règles impératives :
- Privilégie systématiquement les apps du catalogue interne ; élimine ou minimise les outils externes.
- Si aucune app interne ne couvre une étape coûteuse ou stratégique : app_key = null et "new_app" complet (name, mission, inputs, outputs, prefix unique, tables, routes, ai, gain, prompt prêt à coller pour Lovable).
- Tu NE CALCULES AUCUN montant : les coûts sont calculés par le moteur à partir des temps et taux. N'invente aucun chiffre dans "gain" : décris la nature du gain et l'étape concernée.
- "metric_updates"/"parameter_updates" UNIQUEMENT si l'utilisateur donne explicitement un chiffre. evidence.kind = "declared" seulement si evidence.quote reprend MOT POUR MOT les propos de l'utilisateur ; sinon "estimated" avec la raison. Sinon tableaux vides.
- "reply" : réponse pédagogique en français expliquant tes arbitrages.
Réponds UNIQUEMENT par un objet JSON {"reply","ecosystem":{"summary","assignments":[{"node_ref","app_key","reason","gain","requires","effort","impact","mission","new_app"}],"flows","phases"},"metric_updates":[{"ref","field","value","evidence":{"kind","quote","reason"}}],"parameter_updates":[{"field","value","evidence"}]}.`,
      `Étapes To-Be :\n${data.steps.map((s) => `${s.ref} · ${s.label}${s.automated ? " (automatisée)" : ""} — ${s.explanation ?? ""}`).join("\n")}\n\nÉcosystème actuel :\n${JSON.stringify({ summary: current?.summary, assignments: current?.assignments, flows: current?.flows, phases: current?.phases })}\n\nHistorique :\n${history.slice(-10).map((m) => `${m.role}: ${textOf(m)}`).join("\n")}\n\nDemande : ${data.message}\n\nContexte du dossier :\n${data.context}`,
    );
    const out = refineOut.parse(extractJson(text));
    const refs = new Set(data.steps.map((s) => s.ref));
    const userTexts = [data.message, ...history.filter((m) => m.role === "user").map(textOf)];
    const now = new Date().toISOString();
    const next: Eco = {
      ...out.ecosystem,
      assignments: out.ecosystem.assignments.filter((a) => refs.has(a.node_ref)).map((a) => {
        const valid = a.app_key && keys.has(a.app_key) ? a.app_key : null;
        return { ...a, app_key: valid, new_app: valid ? null : a.new_app ?? { name: "Nouvelle app", mission: a.reason, inputs: [], outputs: [], prefix: "", tables: [], routes: [], ai: "", gain: a.gain, prompt: a.reason } };
      }),
      generated_at: now,
      overrides: mergeOverrides(current?.overrides ?? [], out.metric_updates.filter((u) => refs.has(u.ref)).map((u) => ({ ...u, evidence: validateEvidence(u.evidence, userTexts) }))),
      parameter_overrides: mergeOverrides(current?.parameter_overrides ?? [], out.parameter_updates.map((u) => ({ ...u, evidence: validateEvidence(u.evidence, userTexts) }))),
      conversation: [...history,
        { id: `u-${now}`, role: "user", parts: [{ type: "text", text: data.message }] },
        { id: `a-${now}`, role: "assistant", parts: [{ type: "text", text: out.reply }] },
      ] as Eco["conversation"],
    };
    const { error: e2 } = await sb.from("eco_processes").update({ lab_ecosystem: next }).eq("id", data.processId);
    if (e2) throw new Error("Enregistrement impossible.");
    return { reply: out.reply };
  });
