// Écosystème Laboratoire : affectation des apps du Lab aux étapes To-Be (logique pure, sans dépendance).
export type NewAppSpec = {
  name: string; mission: string; inputs: string[]; outputs: string[];
  prefix: string; tables: string[]; routes: string[]; ai: string; gain: string; prompt: string;
};
export type Assignment = {
  node_ref: string; app_key: string | null; reason: string; gain: string;
  requires: ("odoo" | "google")[]; effort: "faible" | "moyen" | "élevé"; impact: "faible" | "moyen" | "fort";
  mission?: string; new_app?: NewAppSpec | null;
  as_is_refs?: string[]; comparison_reason?: string;
};
export type Flow = { from: string; to: string; data: string };
export type EcoPhase = { title: string; app_keys: string[] };
export type LabEcosystem = {
  generated_at: string; summary: string; assignments: Assignment[]; flows: Flow[]; phases: EcoPhase[];
  overrides?: MetricOverride[];
  parameter_overrides?: ParameterOverride[];
  real_frame?: import("./real-frame").RealFrame;
  conversation?: import("ai").UIMessage[];
};
export type Evidence = { kind: "declared" | "estimated"; quote: string; reason: string };
export type MetricOverride = { ref: string; field: "cycle_time_minutes" | "wait_time_minutes" | "hourly_cost"; value: number; evidence: Evidence };
export type ParameterOverride = { field: "annual_volume" | "rework_rate_percent" | "monthly_licences_before" | "monthly_licences_after" | "revenue_per_freed_hour" | "latency_cost_per_hour" | "implementation_cost"; value: number; evidence: Evidence };
export type Connections = { odoo: boolean; google: boolean };
export type WeightedNode = { ref: string; minutes: number };

/** Statut de faisabilité immédiate d'une affectation selon les connexions partagées. */
export function readiness(a: Pick<Assignment, "requires" | "app_key">, c: Connections) {
  if (!a.app_key) return { ready: false, missing: [] as string[], label: "App à créer" };
  const missing = a.requires.filter((r) => !c[r]).map((r) => (r === "odoo" ? "Odoo" : "Google"));
  return { ready: missing.length === 0, missing, label: missing.length ? `Prérequis : connecter ${missing.join(" et ")}` : "Prêt à l’emploi" };
}

/** Part du gain To-Be conservée quand seules certaines apps sont activées (pondérée par les minutes des étapes couvertes). */
export function activationShare(assignments: Assignment[], nodes: WeightedNode[], enabled: Set<string>) {
  let covered = 0, active = 0;
  for (const a of assignments) {
    const n = nodes.find((x) => x.ref === a.node_ref);
    if (!n) continue;
    const key = a.app_key ?? `new:${a.new_app?.name ?? a.node_ref}`;
    covered += n.minutes;
    if (enabled.has(key)) active += n.minutes;
  }
  return covered > 0 ? active / covered : 1;
}

export const assignmentKey = (a: Assignment) => a.app_key ?? `new:${a.new_app?.name ?? a.node_ref}`;

/** Quick wins : prêtes, effort faible ou moyen, triées par impact. */
export function quickWins(assignments: Assignment[], c: Connections) {
  const score = { fort: 3, moyen: 2, faible: 1 } as const;
  return assignments.filter((a) => readiness(a, c).ready && a.effort !== "élevé").sort((x, y) => score[y.impact] - score[x.impact]);
}
