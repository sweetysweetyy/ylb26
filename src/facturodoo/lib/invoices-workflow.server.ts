import type { Ctx } from "@/lib/assistant-apps.server";
type WorkflowContext = { supabase: Ctx["db"]; userId: string };
import { fo } from "@/facturodoo/lib/db";
import { z } from "zod";
import type { Json } from "@/facturodoo/types";
import type { ExtractedInvoice, SupplierCandidate, SupplierMatch } from "./invoice-types";

const LineSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  tax_rate: z.number().nullable(),
  total: z.number().nullable(),
});
const ExtractedSchema = z.object({
  supplier: z.object({
    name: z.string(),
    vat: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    street: z.string().nullable(),
    zip: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    website: z.string().nullable(),
  }),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total: z.number().nullable(),
  payment_reference: z.string().nullable(),
  notes: z.string().nullable(),
  lines: z.array(LineSchema),
  confidence: z.number(),
});

async function loadOdoo(context: { supabase: unknown; userId: string }) {
  const { OdooClient, decryptSecret } = await import("./odoo.server");
  const { data: conn } = await fo(context.supabase).from("odoo_connections").select("*").eq("user_id", context.userId).maybeSingle();
  if (!conn) throw new Error("Connectez d'abord votre base Odoo.");
  const client = new OdooClient({ url: conn.url, db: conn.db, username: conn.username, apiKey: await decryptSecret(conn.api_key) });
  await client.login();
  return client;
}

const normVat = (v: string | null | undefined) => (v ?? "").replace(/[\s.-]/g, "").toUpperCase();

type PartnerRow = { id: number; name: string; vat: string | false; email: string | false; city: string | false };
const toCandidate = (p: PartnerRow, match: SupplierCandidate["match"]): SupplierCandidate => ({
  id: p.id,
  name: p.name,
  vat: p.vat || null,
  email: p.email || null,
  city: p.city || null,
  match,
});

async function findSupplier(client: InstanceType<typeof import("./odoo.server").OdooClient>, supplier: ExtractedInvoice["supplier"]): Promise<SupplierMatch> {
  const fields = ["name", "vat", "email", "city"];
  const candidates: SupplierCandidate[] = [];
  const vat = normVat(supplier.vat);
  if (vat) {
    const all = await client.searchRead<PartnerRow>("res.partner", [["vat", "!=", false], ["is_company", "=", true]], fields, 500);
    for (const p of all) if (normVat(p.vat || "") === vat) candidates.push(toCandidate(p, "vat"));
  }
  if (supplier.name.trim()) {
    const byName = await client.searchRead<PartnerRow>("res.partner", [["name", "ilike", supplier.name.trim()], ["parent_id", "=", false]], fields, 5);
    for (const p of byName) if (!candidates.some((c) => c.id === p.id)) candidates.push(toCandidate(p, "name"));
  }
  return { candidates, best: candidates[0] ?? null };
}

/** 1) Analyse le PDF déposé dans le stockage, enregistre l'extraction et cherche le fournisseur dans Odoo. */
export async function analyzeInvoiceCore({ data, context }: { data: { invoiceId: string }; context: WorkflowContext }) {
    const { supabase, userId } = context;
    const { data: inv } = await fo(supabase).from("fo_invoices").select("id, file_name, storage_path").eq("id", data.invoiceId).eq("user_id", userId).single();
    if (!inv) throw new Error("Facture introuvable.");

    try {
      const { data: file, error: dlErr } = await supabase.storage.from("facturodoo-invoices").download(inv.storage_path);
      if (dlErr || !file) throw new Error("Impossible de lire le PDF déposé.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const base64 = btoa(bin);

      const { extractInvoiceFromPdf } = await import("./ai-extract.server");
      const { resolveAppAiModel } = await import("@/lib/ai-models.server");
      const model = await resolveAppAiModel(context.supabase, context.userId, "facturodoo");
      const extracted = await extractInvoiceFromPdf(base64, inv.file_name, model);

      let match: SupplierMatch = { candidates: [], best: null };
      try {
        const client = await loadOdoo(context);
        match = await findSupplier(client, extracted.supplier);
      } catch { /* pas de connexion Odoo : la revue reste possible */ }

      await supabase
        .from("fo_invoices")
        .update({ status: "review", extracted: extracted as unknown as Json, supplier_match: match as unknown as Json, error_message: null })
        .eq("id", inv.id);
      return { extracted, match };
    } catch (e) {
      const message = (e as Error).message;
      await fo(supabase).from("fo_invoices").update({ status: "error", error_message: message }).eq("id", inv.id);
      throw new Error(message);
    }
}


/** Recherche à la demande d'un fournisseur (pour le sélecteur manuel). */
export async function searchSuppliersCore({ data, context }: { data: { query: string }; context: WorkflowContext }) {
    const client = await loadOdoo(context);
    const rows = await client.searchRead<PartnerRow>("res.partner", ["|", ["name", "ilike", data.query], ["vat", "ilike", data.query]], ["name", "vat", "email", "city"], 8);
    return rows.map((p) => toCandidate(p, "name"));
}


/** 2) Crée (ou réutilise) le fournisseur puis crée réellement le bon de commande et la facture dans Odoo. */
export async function pushInvoiceToOdooCore({ data, context }: { data: { invoiceId: string; extracted: z.infer<typeof ExtractedSchema>; partnerId: number | null; createPurchaseOrder: boolean; attachPdf: boolean }; context: WorkflowContext }) {
    const { supabase, userId } = context;
    const { extracted } = data;
    const { data: inv } = await fo(supabase).from("fo_invoices").select("id, file_name, storage_path, status").eq("id", data.invoiceId).eq("user_id", userId).single();
    if (!inv) throw new Error("Facture introuvable.");
    if (inv.status === "created") throw new Error("Cette facture a déjà été envoyée dans Odoo.");
    await fo(supabase).from("fo_invoices").update({ status: "pushing", error_message: null }).eq("id", inv.id);

    try {
      const client = await loadOdoo(context);

      // --- Fournisseur : existant ou création ---
      let partnerId = data.partnerId;
      let partnerCreated = false;
      if (!partnerId) {
        const match = await findSupplier(client, extracted.supplier);
        if (match.best) partnerId = match.best.id;
      }
      if (!partnerId) {
        const s = extracted.supplier;
        let countryId: number | undefined;
        if (s.country) {
          const c = await client.searchRead<{ id: number }>("res.country", ["|", ["code", "=ilike", s.country], ["name", "ilike", s.country]], ["id"], 1);
          countryId = c[0]?.id;
        }
        const cleanVat = s.vat ? s.vat.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "";
        const base: Record<string, unknown> = {
          name: s.name || "Fournisseur inconnu",
          is_company: true,
          supplier_rank: 1,
          ...(s.email ? { email: s.email } : {}),
          ...(s.phone ? { phone: s.phone } : {}),
          ...(s.street ? { street: s.street } : {}),
          ...(s.zip ? { zip: s.zip } : {}),
          ...(s.city ? { city: s.city } : {}),
          ...(s.website ? { website: s.website } : {}),
          ...(countryId ? { country_id: countryId } : {}),
        };
        try {
          partnerId = await client.create("res.partner", cleanVat ? { ...base, vat: cleanVat } : base);
        } catch (e) {
          if (!cleanVat) throw e;
          // Odoo a refusé le n° de TVA (contrôle base_vat) : on crée sans TVA et on la conserve en note.
          partnerId = await client.create("res.partner", {
            ...base,
            comment: `N° TVA lu sur la facture (refusé par Odoo, à vérifier) : ${s.vat}`,
          });
        }
        partnerCreated = true;
      }

      // --- Devise ---
      let currencyId: number | undefined;
      if (extracted.currency) {
        const cur = await client.searchRead<{ id: number }>("res.currency", [["name", "=", extracted.currency.toUpperCase()], ["active", "=", true]], ["id"], 1);
        currencyId = cur[0]?.id;
      }

      // --- Taxes d'achat correspondant aux taux détectés ---
      const rates = [...new Set(extracted.lines.map((l) => l.tax_rate).filter((r): r is number => r !== null && r > 0))];
      const taxByRate = new Map<number, number>();
      for (const rate of rates) {
        const t = await client.searchRead<{ id: number }>("account.tax", [["type_tax_use", "=", "purchase"], ["amount_type", "=", "percent"], ["amount", "=", rate]], ["id"], 1);
        if (t[0]) taxByRate.set(rate, t[0].id);
      }

      // --- Produit générique "Achat scanné" (requis pour les lignes d'achat) ---
      let productId: number | undefined;
      try {
        const existing = await client.searchRead<{ id: number }>("product.product", [["default_code", "=", "SCAN-ACHAT"]], ["id"], 1);
        productId = existing[0]?.id ?? (await client.create("product.product", { name: "Achat (facture scannée)", default_code: "SCAN-ACHAT", type: "service", purchase_ok: true, sale_ok: false }));
      } catch { productId = undefined; }

      const lines = extracted.lines.length
        ? extracted.lines
        : [{ description: `Facture ${extracted.invoice_number ?? ""}`.trim(), quantity: 1, unit_price: extracted.subtotal ?? extracted.total ?? 0, tax_rate: null, total: null }];

      // --- Bon de commande (module Achats) ---
      let purchaseId: number | null = null;
      let purchaseName: string | null = null;
      let poLineIds: number[] = [];
      const warnings: string[] = [];
      if (data.createPurchaseOrder && productId) {
        // Odoo ≤16 : taxes_id ; Odoo 17+ : tax_ids
        const polFields = await client.call<Record<string, unknown>>("purchase.order.line", "fields_get", [["taxes_id", "tax_ids"]], { attributes: ["type"] });
        const polTaxField = "tax_ids" in polFields ? "tax_ids" : "taxes_id" in polFields ? "taxes_id" : null;
        purchaseId = await client.create("purchase.order", {
          partner_id: partnerId,
          ...(extracted.invoice_number ? { partner_ref: extracted.invoice_number } : {}),
          ...(currencyId ? { currency_id: currencyId } : {}),
          ...(extracted.invoice_date ? { date_order: `${extracted.invoice_date} 00:00:00` } : {}),
          order_line: lines.map((l) => [0, 0, {
            product_id: productId,
            name: l.description,
            product_qty: l.quantity || 1,
            price_unit: l.unit_price,
            ...(polTaxField ? { [polTaxField]: [[6, 0, l.tax_rate && taxByRate.has(l.tax_rate) ? [taxByRate.get(l.tax_rate)] : []]] } : {}),
          }]),
        });
        // Confirmer la demande de prix -> bon de commande
        try { await client.call("purchase.order", "button_confirm", [[purchaseId]]); }
        catch (e) { warnings.push(`Bon de commande non confirmé : ${(e as Error).message}`); }
        const po = await client.call<{ name: string; order_line: number[] }[]>("purchase.order", "read", [[purchaseId]], { fields: ["name", "order_line"] });
        purchaseName = po[0]?.name ?? null;
        poLineIds = po[0]?.order_line ?? [];
      }

      // --- Facture fournisseur (module Facturation) ---
      const moveId = await client.create("account.move", {
        move_type: "in_invoice",
        partner_id: partnerId,
        ...(extracted.invoice_number ? { ref: extracted.invoice_number } : {}),
        ...(extracted.invoice_date ? { invoice_date: extracted.invoice_date } : {}),
        ...(extracted.due_date ? { invoice_date_due: extracted.due_date } : {}),
        ...(extracted.payment_reference ? { payment_reference: extracted.payment_reference } : {}),
        ...(currencyId ? { currency_id: currencyId } : {}),
        ...(purchaseName ? { invoice_origin: purchaseName } : {}),
        ...(extracted.notes ? { narration: extracted.notes } : {}),
        invoice_line_ids: lines.map((l, i) => [0, 0, {
          ...(productId ? { product_id: productId } : {}),
          ...(poLineIds[i] ? { purchase_line_id: poLineIds[i] } : {}),
          name: l.description,
          quantity: l.quantity || 1,
          price_unit: l.unit_price,
          ...(l.tax_rate && taxByRate.has(l.tax_rate) ? { tax_ids: [[6, 0, [taxByRate.get(l.tax_rate)]]] } : { tax_ids: [[6, 0, []]] }),
        }]),
      });
      const mv = await client.call<{ name: string }[]>("account.move", "read", [[moveId]], { fields: ["name"] });

      // --- PDF d'origine en pièce jointe ---
      if (data.attachPdf) {
        try {
          const { data: file, error: dlErr } = await supabase.storage.from("facturodoo-invoices").download(inv.storage_path);
          if (dlErr || !file) throw new Error(dlErr?.message ?? "fichier introuvable");
          const bytes = new Uint8Array(await file.arrayBuffer());
          let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const b64 = btoa(bin);
          const attId = await client.create("ir.attachment", { name: inv.file_name, type: "binary", res_model: "account.move", res_id: moveId, mimetype: "application/pdf", datas: b64 });
          try { await client.call("account.move", "message_post", [[moveId]], { body: "Facture d'origine (scannée)", attachment_ids: [attId] }); } catch { /* chatter optionnel */ }
          try { await client.call("account.move", "write", [[moveId], { message_main_attachment_id: attId }]); } catch { /* champ optionnel */ }
          if (purchaseId) {
            try { await client.create("ir.attachment", { name: inv.file_name, type: "binary", res_model: "purchase.order", res_id: purchaseId, mimetype: "application/pdf", datas: b64 }); } catch { /* optionnel */ }
          }
        } catch (e) { warnings.push(`PDF non joint : ${(e as Error).message}`); }
      }

      await fo(supabase).from("fo_invoices").update({
        status: "created",
        error_message: warnings.length ? warnings.join(" · ") : null,
        extracted: extracted as unknown as Json,
        odoo_partner_id: partnerId,
        odoo_partner_created: partnerCreated,
        odoo_move_id: moveId,
        odoo_move_name: mv[0]?.name ?? null,
        odoo_purchase_id: purchaseId,
        odoo_purchase_name: purchaseName,
      }).eq("id", inv.id);

      return { partnerId, partnerCreated, moveId, moveName: mv[0]?.name ?? null, purchaseId, purchaseName };
    } catch (e) {
      const message = (e as Error).message;
      await fo(supabase).from("fo_invoices").update({ status: "review", error_message: message }).eq("id", inv.id);
      throw new Error(message);
    }
}

