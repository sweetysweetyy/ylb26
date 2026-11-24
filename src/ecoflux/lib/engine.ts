// Moteur d'ingénierie économique : TDABC, contraintes, Hard Cash vs capacité, payback.
export type EngineNode = {
  id: string;
  label: string;
  cycle_time_minutes: number;
  wait_time_minutes: number;
  hourly_cost: number;
  is_automated: boolean;
};
export type EngineInput = {
  annualVolume: number;
  reworkRatePercent: number;
  monthlyLicences: number;
  /** Valeur marchande d'une heure humaine libérée (€/h) */
  revenuePerFreedHour?: number;
  /** Coût de latence par heure d'attente d'une transaction (€/h) */
  latencyCostPerHour?: number;
};

export const LATENCY_COST_PER_HOUR = 0.6;
export const REVENUE_PER_FREED_HOUR = 75;
/** Coût de mise en place forfaitaire par étape automatisée (outil + paramétrage) */
export const IMPLEMENTATION_COST_PER_AUTOMATION = 6000;

export function stepUnitCost(n: EngineNode, input: EngineInput) {
  const labor = (n.cycle_time_minutes / 60) * n.hourly_cost;
  const risk = n.is_automated ? 0 : labor * (input.reworkRatePercent / 100);
  const latency = (n.wait_time_minutes / 60) * (input.latencyCostPerHour ?? LATENCY_COST_PER_HOUR);
  return { labor, risk, latency, total: labor + risk + latency };
}

export function flowMetrics(nodes: EngineNode[], input: EngineInput) {
  let labor = 0, risk = 0, latency = 0, cycle = 0, humanMinutes = 0;
  let bottleneck: EngineNode | null = null;
  for (const n of nodes) {
    const c = stepUnitCost(n, input);
    labor += c.labor; risk += c.risk; latency += c.latency;
    cycle += n.cycle_time_minutes + n.wait_time_minutes;
    if (!n.is_automated) humanMinutes += n.cycle_time_minutes;
    if (!bottleneck || n.cycle_time_minutes + n.wait_time_minutes > bottleneck.cycle_time_minutes + bottleneck.wait_time_minutes) bottleneck = n;
  }
  const licences = input.annualVolume > 0 ? (input.monthlyLicences * 12) / input.annualVolume : 0;
  const unitCost = labor + risk + latency + licences;
  return {
    unitCost, labor, risk, latency, licences,
    cycleMinutes: cycle,
    humanMinutes,
    annualCost: unitCost * input.annualVolume,
    bottleneck,
  };
}

export function compare(asIs: EngineNode[], toBe: EngineNode[], input: EngineInput) {
  const a = flowMetrics(asIs, input);
  const b = flowMetrics(toBe, input);
  const vol = input.annualVolume;
  const hardCash = Math.max(0, (a.risk + a.latency - b.risk - b.latency) * vol);
  const softCash = Math.max(0, (a.labor - b.labor) * vol);
  const hoursFreed = Math.max(0, ((a.humanMinutes - b.humanMinutes) / 60) * vol);
  const capacityValue = hoursFreed * (input.revenuePerFreedHour ?? REVENUE_PER_FREED_HOUR);
  const automations = toBe.filter((n) => n.is_automated).length;
  const implementationCost = automations * IMPLEMENTATION_COST_PER_AUTOMATION;
  const netGain = hardCash + capacityValue;
  const paybackDays = netGain > 0 ? Math.ceil(implementationCost / (netGain / 365)) : null;
  const cycleReduction = a.cycleMinutes > 0 ? ((a.cycleMinutes - b.cycleMinutes) / a.cycleMinutes) * 100 : 0;
  const velocity = b.cycleMinutes > 0 ? a.cycleMinutes / b.cycleMinutes : 0;
  return { asIs: a, toBe: b, hardCash, softCash, hoursFreed, capacityValue, implementationCost, netGain, paybackDays, cycleReduction, velocity };
}

export function formatDuration(min: number) {
  if (min < 1) return `${Math.round(min * 60)} s`;
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 60 * 24) return `${Math.round((min / 60) * 10) / 10} h`;
  return `${Math.round((min / 1440) * 10) / 10} j`;
}
export const eur = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
export const num = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v);
