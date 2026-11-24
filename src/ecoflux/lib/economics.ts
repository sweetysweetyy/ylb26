import type { Workspace } from "./data";
import type { PNode, Tool } from "./types";
import type { Evidence, LabEcosystem, MetricOverride, ParameterOverride } from "./ecosystem";
import { stepUnitCost, LATENCY_COST_PER_HOUR, REVENUE_PER_FREED_HOUR, IMPLEMENTATION_COST_PER_AUTOMATION } from "./engine";

export const precise = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
export const money = (n: number) => `${precise(n)} €`;
export const nodeRef = (n: PNode) => (n.metadata as { ref?: string } | null)?.ref ?? n.id;
export const metricLabel = { cycle_time_minutes: "Temps actif", wait_time_minutes: "Temps d’attente", hourly_cost: "Taux horaire chargé" };
export const metricUnit = { cycle_time_minutes: "min", wait_time_minutes: "min", hourly_cost: "€/h" };
const unknown = (reason: string): Evidence => ({ kind: "estimated", quote: "", reason });

/** A citation is a client declaration, never evidence that a measurement was verified. */
export function validateEvidence(e: Evidence, userTexts: string[]): Evidence {
  if (e.kind === "declared" && e.quote.trim() && userTexts.some((text) => text.includes(e.quote))) return e;
  return { kind: "estimated", quote: "", reason: e.reason || "Estimation sans source vérifiable ; à confirmer." };
}
export function mergeOverrides<T extends MetricOverride | ParameterOverride>(current: T[], updates: T[]) {
  const key = (x: T) => `${"ref" in x ? x.ref : "parameter"}:${x.field}`;
  const result = new Map(current.map((x) => [key(x), x]));
  for (const x of updates) {
    if (!Number.isFinite(x.value) || x.value < 0) throw new Error("Les temps, coûts et volumes doivent être finis et positifs ou nuls.");
    if (x.field === "rework_rate_percent" && x.value > 100) throw new Error("Le taux de reprise doit être compris entre 0 et 100 %.");
    result.set(key(x), x);
  }
  return [...result.values()];
}
export function effectiveNode(n: PNode, ecosystem: LabEcosystem | null) {
  const values = { ...n };
  for (const o of ecosystem?.overrides ?? []) if (o.ref === nodeRef(n)) values[o.field] = o.value;
  return values;
}
export function metricEvidence(n: PNode, field: MetricOverride["field"], ecosystem: LabEcosystem | null): Evidence {
  const override = ecosystem?.overrides?.find((o) => o.ref === nodeRef(n) && o.field === field);
  if (override) return override.evidence;
  return unknown("Valeur du dossier. Sa source chiffrée n’est pas enregistrée individuellement ; une citation de l’étape ne suffit pas à valider ce chiffre.");
}
export const parameterLabels: Record<ParameterOverride["field"], string> = {
  annual_volume: "Volume annuel (dossiers/an)", rework_rate_percent: "Taux de reprise (%)",
  monthly_licences_before: "Licences actuelles (€/mois)", monthly_licences_after: "Licences cibles (€/mois)",
  revenue_per_freed_hour: "Valorisation d’une heure libérée (€/h)", latency_cost_per_hour: "Coût conventionnel d’attente (€/h)", implementation_cost: "Investissement initial (€)",
};
export function economicScenario(w: Workspace, ecosystem: LabEcosystem | null) {
  const before = w.nodes.filter((n) => !n.is_to_be).map((n) => effectiveNode(n, ecosystem));
  const after = w.nodes.filter((n) => n.is_to_be).map((n) => effectiveNode(n, ecosystem));
  const licenceCost = ((w.clarification?.tools ?? []) as Tool[]).reduce((sum, t) => sum + Number(t.monthly_cost || 0), 0);
  const defaults: Record<ParameterOverride["field"], number> = {
    annual_volume: Number(w.process.annual_volume), rework_rate_percent: Number(w.clarification?.rework_rate_percent ?? 0),
    monthly_licences_before: licenceCost, monthly_licences_after: licenceCost,
    revenue_per_freed_hour: REVENUE_PER_FREED_HOUR, latency_cost_per_hour: LATENCY_COST_PER_HOUR,
    implementation_cost: after.filter((n) => n.is_automated).length * IMPLEMENTATION_COST_PER_AUTOMATION,
  };
  const parameters = (Object.keys(defaults) as ParameterOverride["field"][]).map((field) => {
    const override = ecosystem?.parameter_overrides?.find((o) => o.field === field);
    const reason = field === "implementation_cost" ? `Hypothèse du moteur : ${after.filter((n) => n.is_automated).length} étape(s) automatisée(s) × ${IMPLEMENTATION_COST_PER_AUTOMATION} €. Ce n’est pas un devis.`
      : ["revenue_per_freed_hour", "latency_cost_per_hour"].includes(field) ? "Convention du moteur, pas un tarif vérifié. À adapter au client."
      : field === "monthly_licences_after" ? "Hypothèse conservatrice : licences cibles identiques à l’existant. Le coût des outils internes et de l’IA reste à confirmer."
      : "Valeur du dossier sans preuve chiffrée enregistrée ; à confirmer avec le client.";
    return { field, value: override?.value ?? defaults[field], evidence: override?.evidence ?? unknown(reason) };
  });
  const p = Object.fromEntries(parameters.map((x) => [x.field, x.value])) as Record<ParameterOverride["field"], number>;
  const input = { annualVolume: p.annual_volume, reworkRatePercent: p.rework_rate_percent, monthlyLicences: 0, latencyCostPerHour: p.latency_cost_per_hour };
  const sum = (nodes: PNode[], licences: number) => {
    const costs = nodes.map((n) => stepUnitCost(n, input));
    const labor = costs.reduce((s, c) => s + c.labor, 0), risk = costs.reduce((s, c) => s + c.risk, 0), latency = costs.reduce((s, c) => s + c.latency, 0);
    const annual = (labor + risk + latency) * p.annual_volume + licences * 12;
    return { labor, risk, latency, annual, active: nodes.reduce((s, n) => s + n.cycle_time_minutes, 0), waiting: nodes.reduce((s, n) => s + n.wait_time_minutes, 0), human: nodes.filter((n) => !n.is_automated).reduce((s, n) => s + n.cycle_time_minutes, 0), unit: p.annual_volume > 0 ? annual / p.annual_volume : null };
  };
  const a = sum(before, p.monthly_licences_before), b = sum(after, p.monthly_licences_after);
  const hours = Math.max(0, (a.human - b.human) / 60 * p.annual_volume);
  const modelledSavings = a.annual - b.annual;
  const capacity = hours * p.revenue_per_freed_hour;
  // Capacity and reduced labour cost overlap: never sum them into guaranteed cash.
  const modelledNonLabor = ((a.risk + a.latency) - (b.risk + b.latency)) * p.annual_volume + (p.monthly_licences_before - p.monthly_licences_after) * 12;
  const potential = modelledNonLabor + capacity;
  return { before, after, parameters, p, input, a, b, hours, capacity, modelledSavings, modelledNonLabor, potential, paybackDays: potential > 0 ? Math.ceil(p.implementation_cost / potential * 365) : null };
}
/** Décomposition vérifiable d'un coût unitaire : chaque terme est affiché pour être refait à la main. */
export function costBreakdown(n: Pick<PNode, "cycle_time_minutes" | "wait_time_minutes" | "hourly_cost" | "is_automated">, reworkRatePercent: number, latencyCostPerHour: number) {
  const active = Number(n.cycle_time_minutes), wait = Number(n.wait_time_minutes), rate = Number(n.hourly_cost);
  const labor = (active / 60) * rate;
  const risk = n.is_automated ? 0 : labor * (reworkRatePercent / 100);
  const latency = (wait / 60) * latencyCostPerHour;
  const total = labor + risk + latency;
  const parts = [`${precise(active)} min ÷ 60 × ${money(rate)}/h = ${money(labor)}`];
  if (risk > 0) parts.push(`reprise ${precise(reworkRatePercent)} % × ${money(labor)} = ${money(risk)}`);
  if (wait > 0) parts.push(`${precise(wait)} min d’attente ÷ 60 × ${money(latencyCostPerHour)}/h = ${money(latency)}`);
  return { labor, risk, latency, total, lines: parts, formula: `${money(labor)}${risk > 0 ? ` + ${money(risk)}` : ""}${wait > 0 ? ` + ${money(latency)}` : ""} = ${money(total)} par dossier` };
}
