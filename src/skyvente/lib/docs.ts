import { sb } from "./supabase";
import { computeTotals, uid } from "./calc";
import { DOC_LABEL, type Client, type Contact, type Doc, type DocType, type LineItem, type Service, type Settings } from "./types";

export function contactToClient(c: Contact): Client {
  const person = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return {
    name: c.company || person || "Client",
    contact_name: c.company ? person : "",
    email: c.email || "",
    phone: c.phone || "",
    address: c.address || "",
    zip: c.zip || "",
    city: c.city || "",
    country: c.country || "",
    siret: c.siret || "",
    vat_number: c.vat_number || "",
  };
}

export function serviceToItem(s: Service): LineItem {
  return {
    id: uid(),
    service_id: s.id,
    name: s.name,
    description: s.description || "",
    quantity: 1,
    unit: s.unit,
    unit_price: Number(s.unit_price),
    vat_rate: Number(s.vat_rate),
    discount: 0,
  };
}

export function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function nextNumber(type: DocType): Promise<string> {
  const { data, error } = await sb().rpc("sv_next_doc_number", { p_type: type });
  if (error) throw error;
  return data as string;
}

export function totalsFor(items: LineItem[], discount: number, settings: Settings) {
  return computeTotals(items, discount, settings.company.vat_exempt);
}

export async function createDocument(input: {
  type: DocType;
  client: Client;
  contact_id: string | null;
  items: LineItem[];
  settings: Settings;
  parent?: Doc | null;
  title?: string | null;
}): Promise<Doc> {
  const { type, settings, parent } = input;
  const layout = settings.layouts[type];
  const number = type === "invoice" ? null : await nextNumber(type);
  const t = totalsFor(input.items, parent?.global_discount ?? 0, settings);
  const due =
    type === "quote"
      ? addDays(layout.validity_days || 30)
      : type === "invoice"
        ? addDays(settings.company.payment_terms_days || 30)
        : null;
  const row = {
    type,
    number,
    status: "draft",
    title: input.title ?? parent?.title ?? null,
    contact_id: input.contact_id,
    parent_id: parent?.id ?? null,
    client: input.client,
    items: input.items,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: due,
    intro: layout.intro,
    notes: parent?.notes ?? "",
    terms: layout.terms,
    global_discount: parent?.global_discount ?? 0,
    total_ht: t.total_ht,
    total_vat: t.total_vat,
    total_ttc: t.total_ttc,
    history: [{ at: new Date().toISOString(), label: `${DOC_LABEL[type]} créé${parent ? ` depuis ${DOC_LABEL[parent.type]} ${parent.number ?? ""}` : ""}`.trim() }],
  };
  const { data, error } = await sb().from("sv_documents").insert(row).select().single();
  if (error) throw error;
  return data as Doc;
}

export async function convertDocument(parent: Doc, type: DocType, settings: Settings) {
  return createDocument({
    type,
    client: parent.client,
    contact_id: parent.contact_id,
    items: parent.items.map((i) => ({ ...i, id: uid() })),
    settings,
    parent,
  });
}

export const NEXT_STEP: Partial<Record<DocType, DocType>> = {
  quote: "order",
  order: "invoice",
  invoice: "delivery",
};
