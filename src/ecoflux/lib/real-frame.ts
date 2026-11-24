// Cadre économique réel : convertit des réponses simples (salaire brut, volume, incidents…) en paramètres sourcés, sans IA.
import type { Evidence, MetricOverride, ParameterOverride } from "./ecosystem";

export const EMPLOYER_CHARGES = 1.42;
export const MONTHLY_HOURS_35H = 151.67;
export type TimeUse = "absorption" | "overtime" | "commercial";
export type Investment = "lab" | "quote" | "internal";
export type RealFrame = {
  volume: number; volumePeriod: "month" | "year"; volumeSource: string;
  grossSalary: number; charges: number; monthlyHours: number; salarySource: string;
  incidentsPer100: number; incidentsSource: string;
  licencesCancelled: number; licencesSource: string;
  timeUse: TimeUse; timeRate: number;
  investment: Investment; quoteAmount: number; internalDays: number; investmentSource: string;
};
export const emptyFrame = (): RealFrame => ({
  volume: 0, volumePeriod: "month", volumeSource: "", grossSalary: 0, charges: EMPLOYER_CHARGES, monthlyHours: MONTHLY_HOURS_35H, salarySource: "",
  incidentsPer100: 0, incidentsSource: "", licencesCancelled: 0, licencesSource: "", timeUse: "absorption", timeRate: 0,
  investment: "lab", quoteAmount: 0, internalDays: 0, investmentSource: "",
});

const fr = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const ev = (quote: string, source: string): Evidence => ({ kind: "declared", quote, reason: source.trim() ? `Pièce : ${source.trim()}` : "Déclaré par l’utilisateur dans le cadre économique réel." });

export const annualVolume = (f: RealFrame) => f.volumePeriod === "month" ? f.volume * 12 : f.volume;
export const hourlyRate = (f: RealFrame) => f.monthlyHours > 0 ? (f.grossSalary * f.charges) / f.monthlyHours : 0;
export const rateFormula = (f: RealFrame) => `${fr(f.grossSalary)} € brut × ${fr(f.charges)} ÷ ${fr(f.monthlyHours)} h = ${fr(hourlyRate(f))} €/h chargé`;
export const freedHourValue = (f: RealFrame) => f.timeUse === "absorption" ? 0 : f.timeRate;
export const implementationCost = (f: RealFrame) => f.investment === "lab" ? 0 : f.investment === "quote" ? f.quoteAmount : f.internalDays * 7 * hourlyRate(f);

/** Paramètres à écrire ; seules les réponses renseignées (> 0 ou choix explicite) deviennent des données déclarées. */
export function frameOverrides(f: RealFrame, licencesBefore: number, humanRefs: string[]) {
  const params: ParameterOverride[] = [];
  const metrics: MetricOverride[] = [];
  if (f.volume > 0) params.push({ field: "annual_volume", value: annualVolume(f), evidence: ev(`${fr(f.volume)} dossiers par ${f.volumePeriod === "month" ? "mois" : "an"}${f.volumePeriod === "month" ? ` × 12 = ${fr(annualVolume(f))} / an` : ""}`, f.volumeSource) });
  params.push({ field: "rework_rate_percent", value: Math.min(100, f.incidentsPer100), evidence: ev(`${fr(f.incidentsPer100)} dossiers sur 100 posent problème`, f.incidentsSource) });
  if (f.licencesCancelled > 0) params.push({ field: "monthly_licences_after", value: Math.max(0, licencesBefore - f.licencesCancelled), evidence: ev(`${fr(licencesBefore)} € − ${fr(f.licencesCancelled)} € résiliés = ${fr(Math.max(0, licencesBefore - f.licencesCancelled))} €/mois`, f.licencesSource) });
  params.push({ field: "revenue_per_freed_hour", value: freedHourValue(f), evidence: ev(f.timeUse === "absorption" ? "Temps gagné absorbé par l’équipe : 0 € de cash" : `${f.timeUse === "overtime" ? "Heures supp/intérim évitées" : "Temps refacturé"} à ${fr(f.timeRate)} €/h`, "") });
  params.push({ field: "implementation_cost", value: implementationCost(f), evidence: ev(f.investment === "lab" ? "Apps internes du Lab : 0 € d’achat externe" : f.investment === "quote" ? `Devis : ${fr(f.quoteAmount)} €` : `${fr(f.internalDays)} j × 7 h × ${fr(hourlyRate(f))} €/h`, f.investmentSource) });
  if (f.grossSalary > 0) for (const ref of humanRefs) metrics.push({ ref, field: "hourly_cost", value: Math.round(hourlyRate(f) * 100) / 100, evidence: ev(rateFormula(f), f.salarySource) });
  return { params, metrics };
}

/** Part des chiffres du dossier appuyés sur une donnée déclarée. */
export function reliability(items: Evidence[]) {
  const verified = items.filter((e) => e.kind === "declared").length;
  return { verified, total: items.length, percent: items.length ? Math.round((verified / items.length) * 100) : 0 };
}
