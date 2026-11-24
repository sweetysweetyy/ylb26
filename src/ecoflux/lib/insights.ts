// Analyses intelligentes partagées : diagnostic, scénarios what-if, priorisation, confiance.
import { compare, stepUnitCost, type EngineInput, type EngineNode } from "./engine";
import { toEngine } from "./context";
import { meta, type Workspace } from "./data";
import type { PNode, Tool } from "./types";

export function engineInput(w: Workspace): EngineInput {
  const tools = (w.clarification?.tools ?? []) as Tool[];
  return {
    annualVolume: Number(w.process.annual_volume),
    reworkRatePercent: Number(w.clarification?.rework_rate_percent ?? 0),
    monthlyLicences: tools.reduce((s, t) => s + Number(t.monthly_cost || 0), 0),
  };
}

export type Diagnostic = { level: "high" | "medium"; title: string; detail: string; nodeId: string | null };

/** Alertes économiques sur le flux affiché (As-Is ou To-Be). */
export function diagnostics(nodes: EngineNode[], input: EngineInput): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (!nodes.length) return out;
  const totalWait = nodes.reduce((s, n) => s + n.wait_time_minutes, 0);
  const totalCycle = nodes.reduce((s, n) => s + n.cycle_time_minutes, 0);
  for (const n of nodes) {
    if (n.wait_time_minutes >= 24 * 60 && n.wait_time_minutes > 0.4 * totalWait)
      out.push({ level: "high", title: `Attente critique sur « ${n.label} »`, detail: `${Math.round(n.wait_time_minutes / 60)} h d'attente, soit ${Math.round((n.wait_time_minutes / Math.max(1, totalWait)) * 100)} % de l'attente totale du flux.`, nodeId: n.id });
    if (!n.is_automated && n.hourly_cost > 0 && n.hourly_cost < 20)
      out.push({ level: "medium", title: `Coût horaire bas sur « ${n.label} »`, detail: `${n.hourly_cost} €/h chargé semble sous la moyenne française (≈ 35-60 €/h). Vérifiez la donnée.`, nodeId: n.id });
    if (!n.is_automated && totalCycle > 0 && n.cycle_time_minutes > 0.4 * totalCycle && nodes.length > 2)
      out.push({ level: "high", title: `Goulot humain sur « ${n.label} »`, detail: `Cette étape concentre ${Math.round((n.cycle_time_minutes / totalCycle) * 100)} % du temps de travail.`, nodeId: n.id });
  }
  if (totalCycle + totalWait > 0 && totalWait / (totalCycle + totalWait) > 0.8)
    out.push({ level: "medium", title: "Flux dominé par l'attente", detail: `${Math.round((totalWait / (totalCycle + totalWait)) * 100)} % du délai total est de l'attente sans valeur ajoutée.`, nodeId: null });
  if (input.reworkRatePercent >= 10)
    out.push({ level: "medium", title: "Taux de reprise élevé", detail: `${input.reworkRatePercent} % des dossiers sont repris : chaque étape manuelle porte ce surcoût.`, nodeId: null });
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}

export type ScenarioKey = "quick" | "balanced" | "agentic";
export const SCENARIOS: { key: ScenarioKey; title: string; desc: string }[] = [
  { key: "quick", title: "Quick-Wins", desc: "Attentes divisées par 2, aucune automatisation : règles, relances, priorisation." },
  { key: "balanced", title: "Équilibré", desc: "Les 2 étapes manuelles les plus coûteuses automatisées, attentes divisées par 2." },
  { key: "agentic", title: "Full agentique", desc: "Toutes les tâches manuelles confiées à des agents, attentes divisées par 4." },
];

/** Étape automatisée : 10 % du temps de travail initial. */
export function simulate(asIs: EngineNode[], key: ScenarioKey, input: EngineInput): EngineNode[] {
  const manual = asIs.filter((n) => !n.is_automated).sort((a, b) => stepUnitCost(b, input).total - stepUnitCost(a, input).total);
  const auto = new Set(key === "agentic" ? manual.map((n) => n.id) : key === "balanced" ? manual.slice(0, 2).map((n) => n.id) : []);
  const waitFactor = key === "agentic" ? 0.25 : 0.5;
  return asIs.map((n) => ({ ...n, wait_time_minutes: n.wait_time_minutes * waitFactor, ...(auto.has(n.id) ? { is_automated: true, cycle_time_minutes: n.cycle_time_minutes * 0.1 } : {}) }));
}

export function scenarios(w: Workspace) {
  const input = engineInput(w);
  const asIs = w.nodes.filter((n) => !n.is_to_be).map(toEngine);
  return SCENARIOS.map((s) => ({ ...s, result: compare(asIs, simulate(asIs, s.key, input), input) }));
}

export type Opportunity = { id: string; label: string; impact: number; effort: 1 | 2 | 3; quadrant: "quick" | "strategic" | "minor" | "avoid" };

/** Impact = coût annuel de l'étape manuelle ; effort = 1 opération, 2 décision, 3 si étape longue (> 2 h). */
export function opportunities(w: Workspace): Opportunity[] {
  const input = engineInput(w);
  const list = w.nodes.filter((n) => !n.is_to_be && !n.is_automated && n.action_type !== "event");
  const rows = list.map((n) => {
    const e = toEngine(n);
    const impact = stepUnitCost(e, input).total * input.annualVolume;
    const effort: 1 | 2 | 3 = e.cycle_time_minutes > 120 ? 3 : n.action_type === "decision" ? 2 : 1;
    return { id: n.id, label: n.label, impact, effort };
  });
  const median = [...rows].map((r) => r.impact).sort((a, b) => a - b)[Math.floor(rows.length / 2)] ?? 0;
  return rows
    .map((r) => {
      const high = r.impact >= median && r.impact > 0;
      const easy = r.effort === 1;
      const quadrant: Opportunity["quadrant"] = high ? (easy ? "quick" : "strategic") : easy ? "minor" : "avoid";
      return { ...r, quadrant };
    })
    .sort((a, b) => b.impact - a.impact);
}

export type Confidence = "measured" | "declared" | "estimated";
/** Mesuré : la note cite une mesure ; déclaré : citation terrain ; sinon estimation IA. */
export function confidence(n: PNode): Confidence {
  const m = meta(n);
  if (/mesur|chrono|relev/i.test(m.note ?? "")) return "measured";
  if (m.source_quote && m.source_quote.trim()) return "declared";
  return "estimated";
}
export const CONFIDENCE_LABEL: Record<Confidence, string> = { measured: "Mesuré", declared: "Déclaratif client", estimated: "Estimation IA" };

/** Suggestions cliquables contextualisées pour le copilote. */
export function suggestions(w: Workspace, node: PNode | null): string[] {
  if (node) {
    const out = [`Automatiser « ${node.label} » avec un agent IA`, `Réduire l'attente après « ${node.label} »`];
    if (node.action_type === "decision") out.push(`Remplacer la validation « ${node.label} » par une règle automatique`);
    out.push(`Justifier le coût de « ${node.label} »`);
    return out;
  }
  const d = diagnostics(w.nodes.filter((n) => !n.is_to_be).map(toEngine), engineInput(w))[0];
  const out = ["Supprimer les doubles validations", "Réduire le taux de reprise de 50 %", "Quel est le principal goulot ?"];
  if (d) out.unshift(`Traiter : ${d.title}`);
  return out.slice(0, 4);
}
