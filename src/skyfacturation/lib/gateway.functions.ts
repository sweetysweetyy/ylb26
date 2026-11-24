import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sf } from "@/skyfacturation/lib/db";
import { complianceIssues } from "@/skyfacturation/lib/checks";
import type { SfLine, SfParty, SfPayload } from "@/skyfacturation/types";

type Obj = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => Number(v) || 0;
const mergeDiscount = (line: number, global: number) => Math.round((1 - (1 - line / 100) * (1 - global / 100)) * 10000) / 100;

function party(c: Obj, nameKey: "name" | "company"): SfParty {
  return {
    name: s(c[nameKey]) || s(c.contact_name), email: s(c.email), phone: s(c.phone), address: s(c.address),
    zip: s(c.zip), city: s(c.city), country: s(c.country), siret: s(c.siret), vat_number: s(c.vat_number),
  };
}
function lines(items: unknown, global: number): SfLine[] {
  return (Array.isArray(items) ? (items as Obj[]) : []).map((i) => ({
    name: [s(i.name), s(i.description)].filter(Boolean).join(" — "), quantity: n(i.quantity), unit_price: n(i.unit_price),
    vat_rate: n(i.vat_rate), discount: mergeDiscount(n(i.discount), global),
  }));
}

/** Prépare l'envoi : instantané de la facture Sky Vente / Sky Achat, à vérifier avant transmission. */
export const sfPrepare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { source_app: "skyvente" | "skyachat"; doc_id: string }) => {
    if (!["skyvente", "skyachat"].includes(d?.source_app) || !d.doc_id) throw new Error("Document invalide");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let payload: SfPayload;
    if (data.source_app === "skyvente") {
      const { data: d, error } = await supabase.from("sv_documents").select("*").eq("id", data.doc_id).single();
      if (error || !d) throw new Error("Facture Sky Vente introuvable");
      if (!["invoice", "credit_note"].includes(d.type)) throw new Error("Seules les factures et avoirs peuvent être transmis");
      if (!d.number || d.status === "draft") throw new Error("Validez d'abord la facture (numéro définitif) avant l'envoi");
      payload = {
        move_type: d.type === "invoice" ? "out_invoice" : "out_refund", reference: d.number, invoice_date: d.issue_date ?? "",
        due_date: d.due_date, partner: party((d.client ?? {}) as Obj, "name"), lines: lines(d.items, n(d.global_discount)),
        total_ht: n(d.total_ht), total_vat: n(d.total_vat), total_ttc: n(d.total_ttc), notes: s(d.notes),
      };
    } else {
      const { data: d, error } = await supabase.from("sa_documents").select("*").eq("id", data.doc_id).single();
      if (error || !d) throw new Error("Facture Sky Achat introuvable");
      if (!["invoice", "credit_note"].includes(d.type)) throw new Error("Seules les factures et avoirs fournisseurs peuvent être transmis");
      payload = {
        move_type: d.type === "invoice" ? "in_invoice" : "in_refund", reference: d.supplier_reference || d.number,
        invoice_date: d.issue_date ?? "", due_date: d.due_date, partner: party((d.contact ?? {}) as Obj, "company"),
        lines: lines(d.items, n(d.discount_percent)), total_ht: n(d.total_ht), total_vat: n(d.total_vat),
        total_ttc: n(d.total_ttc), notes: s(d.notes),
      };
    }
    const db = sf(supabase);
    const { data: open } = await db.from("sf_transmissions").select("id").eq("source_doc_id", data.doc_id)
      .in("status", ["pending_review", "error"]).maybeSingle();
    const row = { payload_preview: payload, source_doc_ref: payload.reference, status: "pending_review" as const, error_log: null, updated_at: new Date().toISOString() };
    if (open) {
      const { error } = await db.from("sf_transmissions").update(row).eq("id", open.id);
      if (error) throw new Error(error.message);
      return { id: open.id };
    }
    const { data: ins, error } = await db.from("sf_transmissions").insert({
      ...row, user_id: userId, source_app: data.source_app, source_doc_id: data.doc_id, direction: "outbound",
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

async function session(supabase: unknown) {
  const { data } = await (supabase as { from: (t: string) => { select: (c: string) => { maybeSingle: () => Promise<{ data: { url: string; db: string; username: string; api_key: string } | null }> } } })
    .from("odoo_connections").select("url, db, username, api_key").maybeSingle();
  const { openOdoo } = await import("./gateway.server");
  return openOdoo(data);
}

/** Confirmation après vérification : création native dans Odoo, comptabilisation et envoi Peppol. */
export const sfConfirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = sf(context.supabase);
    const { data: t } = await db.from("sf_transmissions").select("*").eq("id", data.id).single();
    if (!t) throw new Error("Transmission introuvable");
    if (t.odoo_move_id) throw new Error("Cette facture a déjà été créée dans Odoo");
    const { data: set } = await db.from("sf_settings").select("*").maybeSingle();
    const issues = complianceIssues(t.payload_preview);
    if (issues.length && (set?.require_siret_validation ?? true)) return { ok: false as const, message: issues.join(" · ") };
    try {
      const { pushInvoice } = await import("./gateway.server");
      const r = await pushInvoice(await session(context.supabase), t.payload_preview, set?.auto_sync_peppol ?? true);
      const sent = t.payload_preview.move_type.startsWith("out") && !r.sendError;
      await db.from("sf_transmissions").update({
        odoo_move_id: r.moveId, odoo_name: r.name, status: sent ? (r.peppol === "done" ? "peppol_delivered" : "peppol_sent") : "synced_odoo",
        peppol_status: r.peppol, peppol_message_id: r.peppolId, error_log: r.sendError, updated_at: new Date().toISOString(),
      }).eq("id", t.id);
      return { ok: true as const, message: r.sendError ? `Facture ${r.name} créée dans Odoo, mais l'envoi a échoué : ${r.sendError}` : `Facture ${r.name} créée dans Odoo${sent ? " et envoyée" : ""}.` };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur Odoo";
      await db.from("sf_transmissions").update({ status: "error", error_log: message, updated_at: new Date().toISOString() }).eq("id", t.id);
      return { ok: false as const, message };
    }
  });

/** Relit dans Odoo le statut réel d'acheminement Peppol. */
export const sfRefresh = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = sf(context.supabase);
    const { data: t } = await db.from("sf_transmissions").select("*").eq("id", data.id).single();
    if (!t?.odoo_move_id) throw new Error("Pas encore créée dans Odoo");
    const { moveState } = await import("./gateway.server");
    const r = await moveState(await session(context.supabase), t.odoo_move_id);
    const status = r.peppol === "done" ? "peppol_delivered" : r.peppol === "error" ? "error" : t.status;
    await db.from("sf_transmissions").update({ peppol_status: r.peppol, peppol_message_id: r.peppolId, odoo_name: r.name, status, updated_at: new Date().toISOString() }).eq("id", t.id);
    return { peppol: r.peppol };
  });

/** Factures fournisseurs reçues dans Odoo, avec indication de celles déjà importées. */
export const sfInbound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listInbound } = await import("./gateway.server");
    try {
      const rows = await listInbound(await session(context.supabase));
      const { data: done } = await sf(context.supabase).from("sf_transmissions").select("odoo_move_id").eq("direction", "inbound").eq("status", "imported");
      const imported = new Set((done ?? []).map((d) => d.odoo_move_id));
      return {
        error: null,
        rows: rows.map((r) => ({
          id: Number(r.id), name: s(r.name), ref: s(r.ref === false ? "" : r.ref),
          partner: Array.isArray(r.partner_id) ? s(r.partner_id[1]) : "", date: r.invoice_date ? s(r.invoice_date) : "",
          total: n(r.amount_total), peppol: r.peppol_move_state ? s(r.peppol_move_state) : null, imported: imported.has(Number(r.id)),
        })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Odoo indisponible", rows: [] };
    }
  });

/** Aperçu d'une facture fournisseur Odoo avant import. */
export const sfInboundPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { move_id: number }) => d)
  .handler(async ({ data, context }) => {
    const { readInbound } = await import("./gateway.server");
    return readInbound(await session(context.supabase), data.move_id);
  });

/** Import confirmé dans Sky Achat (aucune ressaisie). */
export const sfImportInbound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { move_id: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = sf(supabase);
    const { data: dup } = await db.from("sf_transmissions").select("id").eq("odoo_move_id", data.move_id).eq("status", "imported").maybeSingle();
    if (dup) throw new Error("Facture déjà importée dans Sky Achat");
    const { readInbound } = await import("./gateway.server");
    const m = await readInbound(await session(supabase), data.move_id);
    const p = m.partner;
    const { data: doc, error } = await supabase.from("sa_documents").insert({
      user_id: userId, type: "invoice", status: "draft", number: m.name, supplier_reference: m.ref, title: `Facture ${m.ref}`,
      issue_date: m.invoice_date || new Date().toISOString().slice(0, 10), due_date: m.due,
      contact: { company: p.name, contact_name: "", email: p.email, phone: p.phone, address: p.address, zip: p.zip, city: p.city, country: p.country, siret: p.siret, vat_number: p.vat_number },
      items: m.lines.map((l) => ({ id: crypto.randomUUID(), kind: "service", reference: "", name: l.name, description: "", quantity: l.quantity, unit: "u", unit_price: l.unit_price, vat_rate: l.vat_rate, discount: l.discount })),
      total_ht: m.total_ht, total_vat: m.total_vat, total_ttc: m.total_ttc, notes: m.notes,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const payload: SfPayload = { move_type: "in_invoice", reference: m.ref, invoice_date: m.invoice_date, due_date: m.due, partner: p, lines: m.lines, total_ht: m.total_ht, total_vat: m.total_vat, total_ttc: m.total_ttc, notes: m.notes };
    await db.from("sf_transmissions").insert({
      user_id: userId, source_app: "odoo", source_doc_id: doc.id, source_doc_ref: m.ref, direction: "inbound", status: "imported",
      odoo_move_id: data.move_id, odoo_name: m.name, payload_preview: payload,
    });
    return { doc_id: doc.id };
  });
