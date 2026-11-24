// Règles pures : factures, paiements, relevés bancaires, FEC et TVA. Testées dans invoicing.test.ts.
import { round2 } from "./accounting";

export type InvoiceType = "customer_invoice" | "customer_credit_note" | "supplier_bill" | "supplier_credit_note";
export type InvLine = { description: string; quantity: number; unit_price: number; account_id: string; tax_rate_id: string | null };
export type TaxInfo = { id: string; rate_percent: number; tax_account_id: string | null };
export type GenLine = { account_id: string; label: string; debit: number; credit: number; contact_id?: string | null; tax_rate_id?: string | null };

export const isCustomer = (t: InvoiceType) => t === "customer_invoice" || t === "customer_credit_note";
export const isCredit = (t: InvoiceType) => t === "customer_credit_note" || t === "supplier_credit_note";

export function lineAmounts(l: InvLine, taxes: TaxInfo[]) {
  const subtotal = round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0));
  const rate = taxes.find((t) => t.id === l.tax_rate_id)?.rate_percent ?? 0;
  return { subtotal, tax: round2((subtotal * Number(rate)) / 100) };
}

export function invoiceTotals(lines: InvLine[], taxes: TaxInfo[]) {
  let subtotal = 0, tax = 0;
  for (const l of lines) { const a = lineAmounts(l, taxes); subtotal += a.subtotal; tax += a.tax; }
  subtotal = round2(subtotal); tax = round2(tax);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/**
 * Écriture d'une facture. Facture client : débit tiers (TTC), crédit produits (HT) et TVA.
 * Facture fournisseur : inverse. Un avoir inverse le sens.
 */
export function invoiceEntryLines(p: {
  type: InvoiceType; lines: InvLine[]; taxes: TaxInfo[]; partnerAccountId: string; contactId: string; label: string;
}): GenLine[] {
  const { type, lines, taxes, partnerAccountId, contactId, label } = p;
  if (!lines.length) throw new Error("La facture n'a aucune ligne.");
  // sign=+1 : le tiers est au débit (facture client ou avoir fournisseur)
  const sign = isCustomer(type) !== isCredit(type) ? 1 : -1;
  const side = (amount: number, partnerSide: boolean): Pick<GenLine, "debit" | "credit"> => {
    const debitSide = partnerSide ? sign > 0 : sign < 0;
    return debitSide ? { debit: amount, credit: 0 } : { debit: 0, credit: amount };
  };
  const out: GenLine[] = [];
  const taxByAccount = new Map<string, { amount: number; tax_rate_id: string }>();
  for (const l of lines) {
    if (!l.account_id) throw new Error(`Compte manquant sur la ligne « ${l.description} ».`);
    const a = lineAmounts(l, taxes);
    if (a.subtotal > 0) out.push({ account_id: l.account_id, label: l.description || label, ...side(a.subtotal, false), tax_rate_id: l.tax_rate_id });
    if (a.tax > 0) {
      const t = taxes.find((x) => x.id === l.tax_rate_id)!;
      if (!t.tax_account_id) throw new Error("Un taux de TVA utilisé n'a pas de compte de taxe.");
      const cur = taxByAccount.get(t.tax_account_id) ?? { amount: 0, tax_rate_id: t.id };
      cur.amount = round2(cur.amount + a.tax);
      taxByAccount.set(t.tax_account_id, cur);
    }
  }
  for (const [acc, v] of taxByAccount) out.push({ account_id: acc, label: `TVA ${label}`, ...side(v.amount, false), tax_rate_id: v.tax_rate_id });
  const total = invoiceTotals(lines, taxes).total;
  if (total <= 0) throw new Error("Le total de la facture doit être positif.");
  out.unshift({ account_id: partnerAccountId, label, ...side(total, true), contact_id: contactId });
  return out;
}

/** Règlement : encaissement client = débit banque / crédit tiers ; paiement fournisseur = inverse. */
export function paymentEntryLines(p: {
  type: InvoiceType; amount: number; bankAccountId: string; partnerAccountId: string; contactId: string; label: string;
}): GenLine[] {
  const amount = round2(p.amount);
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const moneyIn = isCustomer(p.type) !== isCredit(p.type);
  const bank = { account_id: p.bankAccountId, label: p.label, debit: moneyIn ? amount : 0, credit: moneyIn ? 0 : amount };
  const partner = { account_id: p.partnerAccountId, label: p.label, debit: moneyIn ? 0 : amount, credit: moneyIn ? amount : 0, contact_id: p.contactId };
  return [bank, partner];
}

export function invoiceStatusAfterPayment(total: number, paid: number) {
  return round2(paid) >= round2(total) ? "paid" : round2(paid) > 0 ? "partially_paid" : "posted";
}

/** Relevé CSV : date;libellé;montant (séparateur ; ou ,). Dates JJ/MM/AAAA ou AAAA-MM-JJ, montants « 1 234,56 ». */
export type BankRow = { date: string; description: string; amount: number; external_id: string };
export function parseBankCsv(text: string): BankRow[] {
  const rows: BankRow[] = [];
  const seen = new Map<string, number>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 3) continue;
    const date = parseDate(cells[0]!);
    const amountCell = cells[cells.length - 1]!;
    const amount = Number(amountCell.replace(/\s|\u00a0/g, "").replace(",", "."));
    if (!date || !Number.isFinite(amount)) continue; // ligne d'en-tête ou invalide
    const description = cells.slice(1, -1).join(" ").trim() || "—";
    const key = `${date}|${description}|${amount.toFixed(2)}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    rows.push({ date, description, amount: round2(amount), external_id: `${key}|${n}` });
  }
  return rows;
}
function parseDate(s: string) {
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

/** FEC (art. A47 A-1 LPF) : 18 colonnes, séparateur tabulation. */
export type FecLine = {
  journal_code: string; journal_name: string; entry_number: string; entry_date: string; account_code: string; account_name: string;
  aux_code?: string | null; aux_name?: string | null; reference?: string | null; doc_date?: string | null; label: string;
  debit: number; credit: number; lettering_code?: string | null; lettered_at?: string | null; posted_at: string;
};
export const FEC_HEADER = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
  "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise",
];
const d8 = (s?: string | null) => (s ? s.slice(0, 10).replaceAll("-", "") : "");
const amt = (n: number) => round2(n).toFixed(2).replace(".", ",");
const clean = (s?: string | null) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();
export function buildFec(lines: FecLine[]) {
  const rows = lines.map((l) => [
    clean(l.journal_code), clean(l.journal_name), clean(l.entry_number), d8(l.entry_date), clean(l.account_code), clean(l.account_name),
    clean(l.aux_code), clean(l.aux_name), clean(l.reference) || clean(l.entry_number), d8(l.doc_date ?? l.entry_date), clean(l.label),
    amt(l.debit), amt(l.credit), clean(l.lettering_code), d8(l.lettered_at), d8(l.posted_at), "", "",
  ].join("\t"));
  return [FEC_HEADER.join("\t"), ...rows].join("\r\n") + "\r\n";
}
export function fecFileName(siret: string | null | undefined, closingDate: string) {
  const siren = (siret ?? "").replace(/\D/g, "").slice(0, 9) || "000000000";
  return `${siren}FEC${d8(closingDate)}.txt`;
}

/** Synthèse TVA : comptes 4457* = collectée (solde créditeur), 4456* = déductible (solde débiteur). */
export function vatSummary(lines: { account_code: string; debit: number; credit: number }[]) {
  let collected = 0, deductible = 0;
  for (const l of lines) {
    if (l.account_code.startsWith("4457")) collected += Number(l.credit) - Number(l.debit);
    else if (l.account_code.startsWith("4456")) deductible += Number(l.debit) - Number(l.credit);
  }
  collected = round2(collected); deductible = round2(deductible);
  return { collected, deductible, net: round2(collected - deductible) };
}
