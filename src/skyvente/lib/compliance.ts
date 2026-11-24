import type { Company, Doc } from "./types";

/** Indemnité forfaitaire légale pour frais de recouvrement (art. D441-5 C. com.) */
export const RECOVERY_FEE_EUR = 40;
/** Délai de paiement maximal légal en jours calendaires (art. L441-10 C. com.) */
export const MAX_PAYMENT_DAYS = 60;

/** Nom de l'émetteur avec la mention « EI » obligatoire pour les entrepreneurs individuels. */
export function issuerName(c: Pick<Company, "name" | "is_ei">) {
  const n = c.name || "Votre entreprise";
  return c.is_ei && !/\bEI\b|entrepreneur individuel/i.test(n) ? `${n} EI` : n;
}

/** Mentions légales à imprimer sur une facture ou un avoir. */
export function invoiceLegalMentions(c: Company): string[] {
  return [
    c.vat_exempt ? "TVA non applicable, art. 293 B du CGI." : "",
    c.early_discount || "Escompte pour paiement anticipé : néant.",
    c.late_penalty,
    `Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : ${RECOVERY_FEE_EUR} € (art. D441-5 C. com.).`,
    c.insurance ? `Assurance RC Pro : ${c.insurance}` : "",
  ].filter(Boolean);
}

/** Champs de l'entreprise obligatoires sur une facture française. */
export function missingCompanyFields(c: Company): string[] {
  const m: string[] = [];
  if (!c.name) m.push("Raison sociale / nom");
  if (!c.address || !c.zip || !c.city) m.push("Adresse complète");
  if (!/^\d{9}(\d{5})?$/.test((c.siret || "").replace(/\s/g, ""))) m.push("SIREN / SIRET valide");
  if (!c.is_ei && !c.legal_form) m.push("Forme juridique");
  if (!c.vat_exempt && !c.vat_number) m.push("N° de TVA intracommunautaire");
  if (!c.iban) m.push("IBAN");
  if ((c.payment_terms_days || 0) > MAX_PAYMENT_DAYS) m.push(`Délai de paiement ≤ ${MAX_PAYMENT_DAYS} jours`);
  return m;
}

/** Trous dans une série de numéros PREFIXE-ANNEE-NNNN, par année. */
export function numberingGaps(numbers: string[]): string[] {
  const byYear = new Map<string, { prefix: string; n: Set<number> }>();
  for (const num of numbers) {
    const m = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(num);
    if (!m) continue;
    const k = `${m[1]}-${m[2]}`;
    if (!byYear.has(k)) byYear.set(k, { prefix: k, n: new Set() });
    byYear.get(k)!.n.add(Number(m[3]));
  }
  const gaps: string[] = [];
  for (const { prefix, n } of byYear.values()) {
    const max = Math.max(...n);
    for (let i = 1; i <= max; i++) if (!n.has(i)) gaps.push(`${prefix}-${String(i).padStart(4, "0")}`);
  }
  return gaps.sort();
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Journal des ventes (factures + avoirs validés) pour l'expert-comptable. */
export function salesJournalCsv(docs: Doc[]): string {
  const rows = docs
    .filter((d) => (d.type === "invoice" || d.type === "credit_note") && d.number)
    .sort((a, b) => (a.issue_date + a.number).localeCompare(b.issue_date + b.number));
  const head = ["Date", "N° pièce", "Type", "Client", "SIREN/SIRET client", "TVA client", "Total HT", "TVA", "Total TTC", "Statut", "Empreinte SHA-256"];
  const fr = (n: number) => Number(n).toFixed(2).replace(".", ",");
  const lines = rows.map((d) => [
    d.issue_date, d.number, d.type === "invoice" ? "Facture" : "Avoir", d.client?.name, d.client?.siret, d.client?.vat_number,
    fr(d.total_ht), fr(d.total_vat), fr(d.total_ttc), d.status, d.hash,
  ].map(csvCell).join(";"));
  return "\uFEFF" + [head.map(csvCell).join(";"), ...lines].join("\r\n");
}
