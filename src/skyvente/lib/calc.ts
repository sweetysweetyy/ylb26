import type { LineItem } from "./types";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineHT(it: LineItem) {
  const q = Number(it.quantity) || 0;
  const p = Number(it.unit_price) || 0;
  const d = Math.min(Math.max(Number(it.discount) || 0, 0), 100);
  return round2(q * p * (1 - d / 100));
}

export function computeTotals(items: LineItem[], globalDiscount = 0, vatExempt = false) {
  const gd = Math.min(Math.max(Number(globalDiscount) || 0, 0), 100) / 100;
  const vatByRate: Record<string, number> = {};
  let ht = 0;
  for (const it of items) {
    const l = lineHT(it) * (1 - gd);
    ht += l;
    const rate = vatExempt ? 0 : Number(it.vat_rate) || 0;
    vatByRate[rate] = (vatByRate[rate] || 0) + (l * rate) / 100;
  }
  const subtotal = round2(items.reduce((s, it) => s + lineHT(it), 0));
  const total_ht = round2(ht);
  const vat = Object.fromEntries(Object.entries(vatByRate).map(([k, v]) => [k, round2(v)]));
  const total_vat = round2(Object.values(vat).reduce((s, v) => s + v, 0));
  return {
    subtotal,
    discount_amount: round2(subtotal - total_ht),
    total_ht,
    vat,
    total_vat,
    total_ttc: round2(total_ht + total_vat),
  };
}

export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export const fdate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
