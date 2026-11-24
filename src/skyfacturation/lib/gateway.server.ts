// Passerelle Sky Facturation → Odoo Facturation : uniquement des modèles et méthodes natifs Odoo
// (res.partner, account.tax, account.move, action_post, assistant d'envoi natif / Peppol).
import { odooAuthenticate, odooExecute, type OdooCreds } from "@/lib/odoo.server";
import type { SfLine, SfParty, SfPayload } from "@/skyfacturation/types";

export type OdooSession = { creds: OdooCreds; uid: number };

export async function openOdoo(row: { url: string; db: string; username: string; api_key: string } | null): Promise<OdooSession> {
  if (!row?.url) throw new Error("Aucune connexion Odoo : renseignez-la dans les paramètres du Laboratoire.");
  const creds = { url: row.url, db_name: row.db, username: row.username, api_key: row.api_key };
  return { creds, uid: await odooAuthenticate(creds) };
}

const x = <T>(s: OdooSession, model: string, method: string, args: unknown[] = [], kw: Record<string, unknown> = {}) =>
  odooExecute<T>(s.creds, s.uid, model, method, args, kw);

async function countryId(s: OdooSession, country: string): Promise<number | false> {
  const c = (country || "France").trim();
  const code = /^(fr|france)$/i.test(c) ? "FR" : c.length === 2 ? c.toUpperCase() : null;
  const dom = code ? [["code", "=", code]] : [["name", "ilike", c]];
  const ids = await x<number[]>(s, "res.country", "search", [dom], { limit: 1 });
  return ids[0] ?? false;
}

/** Recherche le partenaire (SIRET, TVA, email) ou le crée, avec son identifiant Peppol. */
export async function resolvePartner(s: OdooSession, p: SfParty): Promise<number> {
  const siret = p.siret.replace(/\s/g, "");
  const tries: unknown[][] = [];
  if (siret) tries.push([["company_registry", "=", siret]]);
  if (p.vat_number) tries.push([["vat", "=", p.vat_number.replace(/\s/g, "")]]);
  if (p.email) tries.push([["email", "=ilike", p.email]]);
  for (const dom of tries) {
    try {
      const ids = await x<number[]>(s, "res.partner", "search", [dom], { limit: 1 });
      if (ids[0]) return ids[0];
    } catch { /* champ absent selon la version : critère suivant */ }
  }
  const base: Record<string, unknown> = {
    name: p.name, is_company: true, email: p.email || false, phone: p.phone || false,
    street: p.address || false, zip: p.zip || false, city: p.city || false,
    country_id: await countryId(s, p.country), vat: p.vat_number ? p.vat_number.replace(/\s/g, "") : false,
  };
  const variants = [
    { ...base, company_registry: siret || false, ...(siret ? { peppol_eas: "0009", peppol_endpoint: siret } : {}) },
    { ...base, company_registry: siret || false },
    base,
  ];
  let last: unknown;
  for (const v of variants) {
    try { return await x<number>(s, "res.partner", "create", [v]); } catch (e) { last = e; }
  }
  throw last instanceof Error ? last : new Error("Création du partenaire impossible dans Odoo");
}

/** Taxe Odoo native correspondant au taux (vente ou achat). */
async function taxIds(s: OdooSession, rate: number, use: "sale" | "purchase", cache: Map<string, number[]>) {
  const key = `${use}:${rate}`;
  if (cache.has(key)) return cache.get(key)!;
  const ids = await x<number[]>(s, "account.tax", "search", [[["type_tax_use", "=", use], ["amount_type", "=", "percent"], ["amount", "=", rate], ["price_include", "=", false]]], { limit: 1 });
  if (!ids.length && rate > 0) throw new Error(`Aucune taxe ${use === "sale" ? "de vente" : "d'achat"} à ${rate} % dans Odoo.`);
  cache.set(key, ids);
  return ids;
}

/** Crée la facture native (account.move), la comptabilise et lance l'envoi électronique natif. */
export async function pushInvoice(s: OdooSession, p: SfPayload, sendPeppol: boolean) {
  const partnerId = await resolvePartner(s, p.partner);
  const use = p.move_type.startsWith("out") ? "sale" : "purchase";
  const cache = new Map<string, number[]>();
  const lines = [];
  for (const l of p.lines) {
    lines.push([0, 0, {
      name: l.name, quantity: l.quantity, price_unit: l.unit_price, discount: l.discount || 0,
      tax_ids: [[6, 0, await taxIds(s, l.vat_rate, use, cache)]],
    }]);
  }
  const vals: Record<string, unknown> = {
    move_type: p.move_type, partner_id: partnerId, invoice_date: p.invoice_date,
    invoice_line_ids: lines, narration: p.notes || false,
  };
  if (p.due_date) vals.invoice_date_due = p.due_date;
  if (use === "sale") vals.payment_reference = p.reference; else vals.ref = p.reference;
  const moveId = await x<number>(s, "account.move", "create", [vals]);
  await x(s, "account.move", "action_post", [[moveId]]);
  let sendError: string | null = null;
  if (sendPeppol && use === "sale") {
    try { await sendNative(s, moveId); } catch (e) { sendError = e instanceof Error ? e.message : "Envoi impossible"; }
  }
  const st = await moveState(s, moveId);
  return { moveId, ...st, sendError };
}

/** Assistant natif « Envoyer » d'Odoo (Odoo 18 puis 17), qui inclut Peppol quand il est activé. */
async function sendNative(s: OdooSession, moveId: number) {
  try {
    const w = await x<number>(s, "account.move.send.wizard", "create", [{ move_id: moveId }], { context: { active_model: "account.move", active_ids: [moveId] } });
    await x(s, "account.move.send.wizard", "action_send_and_print", [[w]], { context: { active_model: "account.move", active_ids: [moveId] } });
    return;
  } catch (e18) {
    try {
      const ctx = { context: { active_model: "account.move", active_ids: [moveId] } };
      const w = await x<number>(s, "account.move.send", "create", [{}], ctx);
      await x(s, "account.move.send", "action_send_and_print", [[w]], ctx);
    } catch {
      throw e18;
    }
  }
}

export async function moveState(s: OdooSession, moveId: number) {
  const read = async (fields: string[]) => (await x<Record<string, unknown>[]>(s, "account.move", "read", [[moveId], fields]))[0] ?? {};
  let r: Record<string, unknown>;
  try { r = await read(["name", "state", "peppol_move_state", "peppol_message_uuid"]); }
  catch { r = await read(["name", "state"]); }
  return {
    name: String(r.name ?? ""),
    peppol: (r.peppol_move_state as string) || null,
    peppolId: (r.peppol_message_uuid as string) || null,
  };
}

/** Factures fournisseurs reçues dans Odoo (Peppol en priorité). */
export async function listInbound(s: OdooSession) {
  const fields = ["name", "ref", "partner_id", "invoice_date", "invoice_date_due", "amount_untaxed", "amount_tax", "amount_total", "state"];
  try {
    return await x<Record<string, unknown>[]>(s, "account.move", "search_read", [[["move_type", "=", "in_invoice"], ["peppol_move_state", "!=", false]], [...fields, "peppol_move_state"]], { limit: 100, order: "create_date desc" });
  } catch {
    return await x<Record<string, unknown>[]>(s, "account.move", "search_read", [[["move_type", "=", "in_invoice"]], fields], { limit: 100, order: "create_date desc" });
  }
}

/** Lecture native d'une facture fournisseur et de son fournisseur pour l'import dans Sky Achat. */
export async function readInbound(s: OdooSession, moveId: number) {
  const [m] = await x<Record<string, unknown>[]>(s, "account.move", "read", [[moveId], ["name", "ref", "partner_id", "invoice_date", "invoice_date_due", "invoice_line_ids", "amount_untaxed", "amount_tax", "amount_total", "narration"]]);
  if (!m) throw new Error("Facture introuvable dans Odoo");
  const lineRows = await x<Record<string, unknown>[]>(s, "account.move.line", "read", [m.invoice_line_ids as number[], ["name", "quantity", "price_unit", "discount", "tax_ids", "display_type"]]);
  const taxIdsAll = [...new Set(lineRows.flatMap((l) => l.tax_ids as number[]))];
  const taxes = taxIdsAll.length ? await x<{ id: number; amount: number }[]>(s, "account.tax", "read", [taxIdsAll, ["amount"]]) : [];
  const rate = new Map(taxes.map((t) => [t.id, t.amount]));
  const lines: SfLine[] = lineRows.filter((l) => !l.display_type || l.display_type === "product").map((l) => ({
    name: String(l.name || ""), quantity: Number(l.quantity), unit_price: Number(l.price_unit), discount: Number(l.discount || 0),
    vat_rate: (l.tax_ids as number[]).reduce((a, id) => a + (rate.get(id) ?? 0), 0),
  }));
  const pid = Array.isArray(m.partner_id) ? (m.partner_id[0] as number) : 0;
  const [p] = pid ? await x<Record<string, unknown>[]>(s, "res.partner", "read", [[pid], ["name", "email", "phone", "street", "zip", "city", "country_id", "vat", "company_registry"]]) : [{}];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(m.name), ref: str(m.ref) || str(m.name), invoice_date: str(m.invoice_date), due: str(m.invoice_date_due) || null,
    total_ht: Number(m.amount_untaxed), total_vat: Number(m.amount_tax), total_ttc: Number(m.amount_total), notes: str(m.narration).replace(/<[^>]+>/g, ""),
    partner: {
      name: str(p?.name), email: str(p?.email), phone: str(p?.phone), address: str(p?.street), zip: str(p?.zip), city: str(p?.city),
      country: Array.isArray(p?.country_id) ? String(p.country_id[1]) : "", siret: str(p?.company_registry), vat_number: str(p?.vat),
    },
    lines,
  };
}
