// Types partagés client/serveur (aucun secret ici).

export interface ExtractedLine {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  total: number | null;
}

export interface ExtractedSupplier {
  name: string;
  vat: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
}

export interface ExtractedInvoice {
  supplier: ExtractedSupplier;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  payment_reference: string | null;
  notes: string | null;
  lines: ExtractedLine[];
  confidence: number;
}

export interface SupplierCandidate {
  id: number;
  name: string;
  vat: string | null;
  email: string | null;
  city: string | null;
  match: "vat" | "name" | "none";
}

export interface SupplierMatch {
  candidates: SupplierCandidate[];
  best: SupplierCandidate | null;
}

export type InvoiceStatus = "analyzing" | "review" | "pushing" | "created" | "error";

export interface OdooScope {
  key: string;
  label: string;
  model: string;
  rights: string[];
  ok: boolean;
  detail?: string;
}

export const emptyInvoice: ExtractedInvoice = {
  supplier: { name: "", vat: null, email: null, phone: null, street: null, zip: null, city: null, country: null, website: null },
  invoice_number: null,
  invoice_date: null,
  due_date: null,
  currency: "EUR",
  subtotal: null,
  tax_amount: null,
  total: null,
  payment_reference: null,
  notes: null,
  lines: [],
  confidence: 0,
};
