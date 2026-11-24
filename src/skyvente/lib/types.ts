export type DocType = "quote" | "order" | "invoice" | "delivery" | "credit_note";

/** Documents fiscaux : numérotés à la validation, inaltérables ensuite. */
export const FISCAL_TYPES: DocType[] = ["invoice", "credit_note"];
export const isFiscal = (t: DocType) => FISCAL_TYPES.includes(t);

export const DOC_LABEL: Record<DocType, string> = {
  quote: "Devis",
  order: "Bon de commande",
  invoice: "Facture",
  delivery: "Livrable",
  credit_note: "Avoir",
};

export const DOC_PREFIX: Record<DocType, string> = {
  quote: "DEV",
  order: "BC",
  invoice: "FAC",
  delivery: "PVL",
  credit_note: "AV",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  accepted: "Accepté",
  refused: "Refusé",
  final: "Validée",
  paid: "Payée",
  cancelled: "Annulé",
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unit_price: number;
  vat_rate: number;
  duration: string | null;
  created_at?: string;
};

export type Contact = {
  id: string;
  kind: "company" | "individual";
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  siret: string | null;
  vat_number: string | null;
  tags: string | null;
  notes: string | null;
  created_at?: string;
};

export type LineItem = {
  id: string;
  service_id?: string | null;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  discount: number; // percent
};

export type Client = {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  siret?: string;
  vat_number?: string;
};

export type Signature = {
  name: string;
  image: string;
  signed_at: string;
  ip?: string | null;
  user_agent?: string | null;
  hash?: string | null;
};

export type Doc = {
  id: string;
  type: DocType;
  number: string | null;
  status: string;
  title: string | null;
  contact_id: string | null;
  parent_id: string | null;
  root_id: string | null;
  client: Client;
  items: LineItem[];
  issue_date: string;
  due_date: string | null;
  intro: string | null;
  notes: string | null;
  terms: string | null;
  global_discount: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  sign_token: string | null;
  signature: Signature | null;
  provider_signature: Signature | null;
  service_date?: string | null;
  hash?: string | null;
  finalized_at?: string | null;
  credited_id?: string | null;
  created_at: string;
  updated_at?: string;
};

export type BlockId =
  | "header"
  | "parties"
  | "meta"
  | "intro"
  | "items"
  | "totals"
  | "notes"
  | "terms"
  | "signature"
  | "custom"
  | "footer";

export type Block = {
  id: BlockId;
  visible: boolean;
  align?: "left" | "center" | "right";
  spacing?: number; // px top margin
  text?: string; // for custom block
};

export type DocLayout = {
  title: string;
  accent: string;
  text_color: string;
  font: "Inter" | "Space Grotesk" | "Georgia" | "Helvetica";
  font_size: number;
  header_style: "band" | "minimal" | "split";
  table_style: "striped" | "lined" | "boxed";
  show_logo: boolean;
  intro: string;
  terms: string;
  footer: string;
  validity_days: number;
  blocks: Block[];
};

export type Company = {
  name: string;
  legal_form: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  siret: string;
  vat_number: string;
  rcs: string;
  capital: string;
  iban: string;
  bic: string;
  logo_url: string;
  vat_exempt: boolean;
  payment_terms_days: number;
  late_penalty: string;
  /** Entreprise individuelle : mention « EI » obligatoire (décret 2022-725) */
  is_ei: boolean;
  early_discount: string;
  insurance: string;
  mediator: string;
};

export type Settings = {
  company: Company;
  layouts: Record<DocType, DocLayout>;
};
