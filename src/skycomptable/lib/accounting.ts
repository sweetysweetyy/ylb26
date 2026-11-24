// Règles comptables pures (sans accès réseau), testées dans accounting.test.ts.

export type DraftLine = { account_id: string; label: string; debit: number; credit: number };

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function entryTotals(lines: DraftLine[]) {
  const debit = round2(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
  const credit = round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  return { debit, credit, delta: round2(debit - credit) };
}

/** Retourne la liste des problèmes empêchant la validation d'une écriture. */
export function validateEntry(lines: DraftLine[]): string[] {
  const errors: string[] = [];
  const filled = lines.filter((l) => l.account_id && ((l.debit || 0) > 0 || (l.credit || 0) > 0));
  if (filled.length < 2) errors.push("Au moins deux lignes avec un compte et un montant sont requises.");
  if (lines.some((l) => (l.debit || 0) > 0 && (l.credit || 0) > 0))
    errors.push("Une ligne ne peut pas avoir à la fois un débit et un crédit.");
  if (lines.some((l) => (l.debit || 0) < 0 || (l.credit || 0) < 0))
    errors.push("Les montants doivent être positifs.");
  const t = entryTotals(filled);
  if (t.delta !== 0) errors.push(`Écriture non équilibrée (écart : ${formatEUR(t.delta)}).`);
  return errors;
}

export type LedgerLine = { account_id: string; debit: number | string; credit: number | string };

/** Balance générale : totaux et solde par compte. */
export function trialBalance(lines: LedgerLine[]) {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const cur = map.get(l.account_id) ?? { debit: 0, credit: 0 };
    cur.debit = round2(cur.debit + Number(l.debit));
    cur.credit = round2(cur.credit + Number(l.credit));
    map.set(l.account_id, cur);
  }
  return map;
}

export function formatEUR(n: number | string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

/** Nature produit/charge : classe 7 = produit, classe 6 = charge (PCG), sinon le type saisi ("revenue" = "income"). */
export function accountNature(code: string, type: string): string {
  if (code?.startsWith("7")) return "income";
  if (code?.startsWith("6")) return "expense";
  return type === "revenue" ? "income" : type;
}
