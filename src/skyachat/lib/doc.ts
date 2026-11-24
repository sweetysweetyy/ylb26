import type { Database } from "@/integrations/supabase/types";

export type Contact = Database["public"]["Tables"]["sa_contacts"]["Row"];
export type Product = Database["public"]["Tables"]["sa_products"]["Row"];
// Extra legal columns added by the complementary SkyAchat SQL (sa_settings).
export type Settings = Database["public"]["Tables"]["sa_settings"]["Row"] & {
  legal_form: string; capital: string; rcs_city: string; late_penalty_rate: string;
  recovery_fee_mention: boolean; early_payment_discount: string; vat_exemption_mention: string; invoice_footer: string;
};
export type DocumentRow = Database["public"]["Tables"]["sa_documents"]["Row"];
export type DocType = Database["public"]["Enums"]["sa_doc_type"];
export type DocStatus = Database["public"]["Enums"]["sa_doc_status"];

export type LineItem = {
  id: string;
  product_id?: string | null;
  kind: "bien" | "service";
  reference: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  discount: number; // % per line
};

export type ContactSnapshot = {
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  siret: string;
  vat_number: string;
};

/** Odoo-like purchase flow: RFQ → PO → Receipt → Bill. */
export const DOC_STEPS: DocType[] = ["quote", "order", "delivery", "invoice"];

export const DOC_LABEL: Record<DocType, string> = {
  quote: "Demande de devis",
  order: "Bon de commande",
  delivery: "PV de réception",
  invoice: "Facture fournisseur",
  credit_note: "Avoir fournisseur",
};

export const DOC_SHORT: Record<DocType, string> = {
  quote: "Devis",
  order: "Commande",
  delivery: "Réception",
  invoice: "Facture",
  credit_note: "Avoir",
};

export const DOC_PLURAL: Record<DocType, string> = {
  quote: "Demandes de devis",
  order: "Bons de commande",
  delivery: "PV de réception",
  invoice: "Factures fournisseurs",
  credit_note: "Avoirs fournisseurs",
};

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  paid: "Payée",
  signed: "Signé",
  cancelled: "Annulé",
  approved: "Bon à payer",
  disputed: "En litige",
};

export function emptySnapshot(): ContactSnapshot {
  return {
    company: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    zip: "",
    city: "",
    country: "France",
    siret: "",
    vat_number: "",
  };
}

export function contactToSnapshot(c: Contact): ContactSnapshot {
  return {
    company: c.company ?? "",
    contact_name: c.contact_name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    zip: c.zip ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
    siret: c.siret ?? "",
    vat_number: c.vat_number ?? "",
  };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function productToItem(p: Product): LineItem {
  return {
    id: newId(),
    product_id: p.id,
    kind: p.kind ?? "bien",
    reference: p.reference ?? "",
    name: p.name,
    description: p.description ?? "",
    quantity: 1,
    unit: p.unit ?? "",
    unit_price: Number(p.unit_price),
    vat_rate: Number(p.vat_rate),
    discount: 0,
  };
}

export function blankItem(): LineItem {
  return {
    id: newId(),
    product_id: null,
    kind: "bien",
    reference: "",
    name: "",
    description: "",
    quantity: 1,
    unit: "u",
    unit_price: 0,
    vat_rate: 20,
    discount: 0,
  };
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(i: LineItem) {
  return r2((Number(i.quantity) || 0) * (Number(i.unit_price) || 0) * (1 - (Number(i.discount) || 0) / 100));
}

export type Totals = {
  subtotal: number;
  discount: number;
  shipping: number;
  ht: number;
  vatByRate: { rate: number; base: number; vat: number }[];
  vat: number;
  ttc: number;
};

/** Global discount applies to lines; shipping is taxed at the dominant (highest) VAT rate. */
export function computeTotals(items: LineItem[], discountPercent = 0, shipping = 0): Totals {
  const subtotal = r2(items.reduce((s, i) => s + lineTotal(i), 0));
  const factor = 1 - (Number(discountPercent) || 0) / 100;
  const map = new Map<number, number>();
  for (const i of items) {
    const rate = Number(i.vat_rate) || 0;
    map.set(rate, (map.get(rate) ?? 0) + lineTotal(i) * factor);
  }
  const ship = Number(shipping) || 0;
  if (ship) {
    const rate = map.size ? Math.max(...map.keys()) : 20;
    map.set(rate, (map.get(rate) ?? 0) + ship);
  }
  const vatByRate = [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, base]) => ({ rate, base: r2(base), vat: r2((base * rate) / 100) }));
  const ht = r2(subtotal * factor + ship);
  const vat = r2(vatByRate.reduce((s, v) => s + v.vat, 0));
  return { subtotal, discount: r2(subtotal - subtotal * factor), shipping: ship, ht, vatByRate, vat, ttc: r2(ht + vat) };
}

export function formatMoney(n: number, currency: string | null = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(n) || 0);
}

export function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d.length === 10 ? d + "T00:00:00" : d);
  return dt.toLocaleDateString("fr-FR");
}

export function prefixFor(type: DocType, s?: Partial<Database["public"]["Tables"]["sa_settings"]["Row"]> | null) {
  if (type === "quote") return s?.quote_prefix || "DDV";
  if (type === "order") return s?.order_prefix || "BC";
  if (type === "invoice") return s?.invoice_prefix || "FAF";
  if (type === "credit_note") return s?.credit_note_prefix || "AV";
  return s?.delivery_prefix || "PVR";
}

/** e.g. BC-2026-0007 : next sequence after the highest existing number for this prefix/year. */
export function nextNumber(prefix: string, year: number, existing: string[]) {
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const n of existing) {
    if (n.startsWith(head)) {
      const v = parseInt(n.slice(head.length), 10);
      if (!Number.isNaN(v) && v > max) max = v;
    }
  }
  return `${head}${String(max + 1).padStart(4, "0")}`;
}

export function parseItems(v: unknown): LineItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => ({ ...blankItem(), ...(x as Partial<LineItem>) }));
}

export function parseSnapshot(v: unknown): ContactSnapshot {
  return { ...emptySnapshot(), ...((v as Partial<ContactSnapshot>) ?? {}) };
}

export const DEFAULT_SETTINGS: Omit<Settings, "user_id" | "created_at" | "updated_at"> = {
  company_name: "",
  address: "",
  zip: "",
  city: "",
  country: "France",
  email: "",
  phone: "",
  website: "",
  siret: "",
  vat_number: "",
  iban: "",
  logo_data_url: "",
  primary_color: "#1f4d3a",
  accent_color: "#c8873a",
  legal_mentions: "",
  quote_footer: "",
  order_footer: "",
  delivery_footer: "",
  quote_prefix: "DDV",
  order_prefix: "BC",
  invoice_prefix: "FAF",
  delivery_prefix: "PVR",
  default_payment_terms: "Paiement à 30 jours fin de mois",
  currency: "EUR",
  legal_form: "",
  capital: "",
  rcs_city: "",
  late_penalty_rate: "Taux directeur semestriel BCE majoré de 10 points",
  recovery_fee_mention: true,
  early_payment_discount: "Aucun escompte pour paiement anticipé",
  vat_exemption_mention: "",
  invoice_footer: "",
  credit_note_prefix: "AV",
};

// ---------------------------------------------------------------------
// Verrouillage (anti-fraude) : statuts qui figent un document.
// ---------------------------------------------------------------------
export function shouldLock(type: DocType, status: DocStatus) {
  if (status === "paid" || status === "approved" || status === "signed") return true;
  if (type === "order" && (status === "accepted" || status === "sent")) return true;
  if (type === "credit_note" && status === "sent") return true;
  return false;
}

// ---------------------------------------------------------------------
// Réceptions partielles (reliquats) : quantités reçues par ligne de commande.
// ---------------------------------------------------------------------
const keyOf = (i: LineItem) => (i.reference || i.name || "").trim().toLowerCase();

function findLine(lines: LineItem[], target: LineItem) {
  return lines.find((l) => l.id === target.id) ?? lines.find((l) => keyOf(l) !== "" && keyOf(l) === keyOf(target));
}

/** Quantité déjà reçue pour chaque ligne de la commande (cumul de tous les PV). */
export function receivedQty(orderLine: LineItem, deliveries: LineItem[][]) {
  return deliveries.reduce((s, items) => s + (Number(findLine(items, orderLine)?.quantity) || 0), 0);
}

/** Lignes restant à réceptionner (quantité = reliquat). */
export function remainingItems(orderItems: LineItem[], deliveries: LineItem[][]): LineItem[] {
  return orderItems
    .map((l) => ({ ...l, quantity: Math.max(0, (Number(l.quantity) || 0) - receivedQty(l, deliveries)) }))
    .filter((l) => l.quantity > 0);
}

// ---------------------------------------------------------------------
// Rapprochement 3 voies : Commandé / Reçu / Facturé + écart de prix.
// ---------------------------------------------------------------------
export type MatchLine = {
  name: string;
  ordered: number;
  received: number;
  invoiced: number;
  orderPrice: number | null;
  invoicePrice: number;
  issues: string[];
};

export function threeWayMatch(orderItems: LineItem[] | null, deliveries: LineItem[][], invoiceItems: LineItem[]) {
  const lines: MatchLine[] = invoiceItems.map((inv) => {
    const ord = orderItems ? findLine(orderItems, inv) : undefined;
    const ordered = ord ? Number(ord.quantity) || 0 : 0;
    const received = ord ? receivedQty(ord, deliveries) : 0;
    const invoiced = Number(inv.quantity) || 0;
    const issues: string[] = [];
    if (!ord) issues.push("Absent de la commande");
    else {
      if (invoiced > ordered) issues.push(`Facturé (${invoiced}) > commandé (${ordered})`);
      if (inv.kind === "bien" && invoiced > received) issues.push(`Facturé (${invoiced}) > reçu (${received})`);
      if (Math.abs((Number(inv.unit_price) || 0) - (Number(ord.unit_price) || 0)) > 0.005)
        issues.push(`Prix ${inv.unit_price} ≠ ${ord.unit_price} commandé`);
    }
    return { name: inv.name || inv.reference, ordered, received, invoiced, orderPrice: ord ? Number(ord.unit_price) : null, invoicePrice: Number(inv.unit_price) || 0, issues };
  });
  return { lines, ok: lines.length > 0 && lines.every((l) => l.issues.length === 0) };
}

// ---------------------------------------------------------------------
// Délais de paiement (loi LME) : 60 jours max à compter de la date de facture.
// ---------------------------------------------------------------------
export const LME_MAX_DAYS = 60;

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86_400_000);
}

export function exceedsLme(issueDate: string, dueDate?: string | null) {
  return !!dueDate && daysBetween(issueDate, dueDate) > LME_MAX_DAYS;
}

/** Nature de l'opération (mention obligatoire réforme 2026). */
export function operationNature(items: LineItem[]) {
  const b = items.some((i) => i.kind === "bien");
  const s = items.some((i) => i.kind === "service");
  return b && s ? "Opération mixte" : s ? "Prestation de services" : "Livraison de biens";
}
