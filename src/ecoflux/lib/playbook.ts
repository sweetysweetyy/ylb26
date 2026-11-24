import { author, exchangeNo, metricsFor } from "./context";
import { meta, type Workspace } from "./data";
import { eur, num } from "./engine";
import type { Phase, TraceAction } from "./types";
import type { RoundUpAI } from "./ai.functions";
import { applications } from "@/lib/laboratory";
import type { LabEcosystem } from "./ecosystem";

export function resolveActions(w: Workspace, actions: RoundUpAI["actions"]): TraceAction[] {
  return actions.map((a) => {
    const refs = String(a.node_ref ?? "").toUpperCase().match(/N\d+/g) ?? [];
    const node = refs.map((r) => w.nodes.find((n) => n.is_to_be && meta(n).ref === r)).find(Boolean);
    const message = w.messages.find((m) => exchangeNo(m, w.messages) === a.exchange && m.content.includes(a.citation) && a.citation.trim().length > 0);
    return { title: a.title, node_id: node?.id ?? null, chat_message_id: message?.id ?? null, citation: message ? a.citation : "", rule: a.rule, owner: a.owner, tools: a.tools, confidence: a.confidence };
  });
}

export function playbookText(w: Workspace) {
  const r = w.roundUp;
  if (!r) throw new Error("Générez le Round Up avant l’export.");
  const m = metricsFor(w);
  const actions = r.decisions_traceability as TraceAction[];
  const phases = r.phases as Phase[];
  return [
    `# Playbook de transformation — ${w.client.name}`,
    `## ${w.process.title}\nDossier ${w.process.reference ?? w.process.id}\nÉtabli le ${new Date(r.created_at).toLocaleDateString("fr-FR")}`,
    `## Synthèse\n${r.executive_summary}`,
    `## Impact annuel estimé\n- Économies directes estimées : ${eur(r.hard_cash_savings_annual)}\n- Capacité libérée : ${num(r.capacity_unlocked_hours_annual)} h/an\n- Potentiel de capacité marchande : ${eur(r.capacity_revenue_potential)}\n- Investissement estimé : ${eur(r.implementation_cost)}\n- Amortissement : ${r.payback_days > 0 ? `J+${r.payback_days}` : "non calculable"}\n- Réduction du cycle : ${Math.round(r.cycle_time_reduction_percent)} %\n- Coût unitaire actuel : ${eur(m.asIs.unitCost)} ; cible : ${eur(m.toBe.unitCost)}`,
    "Les résultats sont des estimations : la capacité marchande ne constitue pas une économie de trésorerie garantie. Les coûts du risque et de la latence reposent sur les hypothèses du modèle.",
    `## Calendrier\n${phases.map((p) => `### Phase ${p.phase} — ${p.title}\n${(p.steps ?? []).map((s) => `- ${s}`).join("\n")}`).join("\n\n")}`,
    `## Protocole et responsabilités\n${actions.map((a, i) => {
      const n = w.nodes.find((n) => n.id === a.node_id);
      const chat = w.messages.find((c) => c.id === a.chat_message_id);
      return `### ${i + 1}. ${a.title}\n${a.rule ?? ""}\nResponsable : ${a.owner ?? "À confirmer"}\nOutils : ${a.tools ?? "À confirmer"}\nOrigine : ${n ? `nœud #${meta(n).ref} — ${n.label}` : "nœud non lié"}${chat ? ` · ${author(chat)}, échange ${exchangeNo(chat, w.messages)}\nCitation : « ${a.citation} »` : " · recommandation sans citation vérifiée"}`;
    }).join("\n\n")}`,
    ecosystemPlaybook(w),
    `## Description terrain\n${w.process.raw_input ?? ""}`,
    `## Historique des échanges\n${w.messages.map((c) => `### Échange ${exchangeNo(c, w.messages)} — ${author(c)}\n${c.content}`).join("\n\n")}`,
  ].filter(Boolean).join("\n\n");
}

export function downloadPlaybook(w: Workspace) {
  const url = URL.createObjectURL(new Blob([playbookText(w)], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `Playbook-${w.client.name.replace(/[^a-zA-Z0-9À-ÿ-]/g, "-")}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Section Markdown ajoutée au playbook quand l'écosystème existe. */
export function ecosystemPlaybook(w: Workspace) {
  const eco = (w.process as unknown as { lab_ecosystem?: LabEcosystem | null }).lab_ecosystem;
  const labApp = (k: string | null) => applications.find((a) => a.key === k) ?? null;
  const appName = (k: string) => k.startsWith("new:") ? `${k.slice(4)} (à créer)` : labApp(k)?.name ?? k;
  if (!eco) return "";
  return `## Architecture applicative recommandée (Laboratoire)\n${eco.summary}\n\n${eco.assignments.map((a) => {
    const n = w.nodes.find((x) => x.is_to_be && meta(x).ref === a.node_ref);
    return `- ${a.node_ref} ${n?.label ?? ""} → ${a.app_key ? labApp(a.app_key)?.name ?? a.app_key : `${a.new_app?.name ?? "App"} (à créer)`} : ${a.reason}${a.gain ? ` — ${a.gain}` : ""}`;
  }).join("\n")}\n\n### Calendrier d’activation\n${eco.phases.map((p, i) => `- Phase ${i + 1} — ${p.title} : ${p.app_keys.map(appName).join(", ")}`).join("\n")}`;
}
