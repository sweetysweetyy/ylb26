import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeSnapshot, demoRaw, type RawData, type Snapshot } from "@/pulse/lib/kpi";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { pls } from "@/pulse/lib/db";
type Json = never;

type Conn = { url: string; db: string; login: string; api_key: string };

// Native Odoo models read by the dashboard (read-only scopes).
export const ODOO_SCOPES = [
  { model: "res.company", module: "base", why: "Devise et société" },
  { model: "sale.order", module: "sale", why: "Devis, commandes, CA" },
  { model: "sale.order.line", module: "sale", why: "Produits les plus vendus" },
  { model: "purchase.order", module: "purchase", why: "Achats, fournisseurs" },
  { model: "account.move", module: "account", why: "Factures, créances, dettes" },
  { model: "crm.lead", module: "crm", why: "Pipeline commercial (optionnel)" },
];

async function rpc(url: string, service: string, method: string, args: unknown[]) {
  const res = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
  });
  if (!res.ok) throw new Error(`Odoo a répondu ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { data?: { message?: string }; message?: string } };
  if (json.error) throw new Error(json.error.data?.message ?? json.error.message ?? "Erreur Odoo");
  return json.result;
}

function normalize(c: Conn): Conn {
  let url = c.url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return { url, db: c.db.trim(), login: c.login.trim(), api_key: c.api_key.trim() };
}

async function authenticate(c: Conn) {
  const uid = await rpc(c.url, "common", "authenticate", [c.db, c.login, c.api_key, {}]);
  if (!uid) throw new Error("Identifiants Odoo refusés (base, login ou clé API).");
  return uid as number;
}

type Row = Record<string, unknown>;
const m2o = (v: unknown) => (Array.isArray(v) ? String(v[1]) : "—");

async function fetchRaw(c: Conn): Promise<RawData> {
  const uid = await authenticate(c);
  const sr = (model: string, domain: unknown[], fields: string[], ctx: Row = {}) =>
    rpc(c.url, "object", "execute_kw", [c.db, uid, c.api_key, model, "search_read", [domain], { fields, limit: 5000, context: ctx }]) as Promise<Row[]>;
  const safe = async <T,>(p: Promise<T>) => {
    try {
      return await p;
    } catch {
      return null;
    }
  };
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10);
  const modules: string[] = [];

  const [company, so, po, moves, lines, leads] = await Promise.all([
    safe(sr("res.company", [], ["name", "currency_id"])),
    safe(sr("sale.order", [["date_order", ">=", since]], ["date_order", "amount_untaxed", "state", "partner_id"])),
    safe(sr("purchase.order", [["date_order", ">=", since]], ["date_order", "amount_untaxed", "state", "partner_id"])),
    safe(
      sr(
        "account.move",
        [["move_type", "in", ["out_invoice", "in_invoice"]], ["state", "=", "posted"], "|", ["invoice_date", ">=", since], ["payment_state", "in", ["not_paid", "partial"]]],
        ["move_type", "invoice_date", "invoice_date_due", "amount_total", "amount_residual"],
      ),
    ),
    safe(sr("sale.order.line", [["order_id.state", "in", ["sale", "done"]], ["order_id.date_order", ">=", since]], ["product_id", "price_subtotal"])),
    safe(sr("crm.lead", [["type", "=", "opportunity"]], ["expected_revenue", "probability", "active"], { active_test: false })),
  ]);
  if (so) modules.push("sale");
  if (po) modules.push("purchase");
  if (moves) modules.push("account");
  if (leads) modules.push("crm");
  if (!so && !po && !moves) throw new Error("Aucun module Ventes, Achats ou Facturation accessible avec ce compte.");

  return {
    currency: company?.[0] ? m2o(company[0].currency_id) : "EUR",
    company: company?.[0] ? String(company[0].name) : undefined,
    sales: (so ?? []).map((r: any) => ({ date: String(r.date_order).slice(0, 10), amount: Number(r.amount_untaxed) || 0, confirmed: ["sale", "done"].includes(String(r.state)), partner: m2o(r.partner_id) })),
    purchases: (po ?? []).map((r: any) => ({ date: String(r.date_order).slice(0, 10), amount: Number(r.amount_untaxed) || 0, confirmed: ["purchase", "done"].includes(String(r.state)), partner: m2o(r.partner_id) })),
    invoices: (moves ?? []).map((r: any) => ({
      type: r.move_type === "out_invoice" ? ("out" as const) : ("in" as const),
      date: String(r.invoice_date || ""),
      due: r.invoice_date_due ? String(r.invoice_date_due) : null,
      total: Number(r.amount_total) || 0,
      residual: Number(r.amount_residual) || 0,
    })),
    lines: (lines ?? []).map((r: any) => ({ product: m2o(r.product_id), amount: Number(r.price_subtotal) || 0 })),
    leads: leads ? leads.map((r: any) => ({ revenue: Number(r.expected_revenue) || 0, prob: Number(r.probability) || 0, active: Boolean(r.active) })) : null,
    modules,
  };
}

export const saveOdooConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Conn) => {
    if (!d.url || !d.db || !d.login || !d.api_key) throw new Error("Tous les champs sont requis.");
    return normalize(d);
  })
  .handler(async ({ data, context }) => {
    await authenticate(data);
    const { error } = await context.supabase.from("odoo_connections").upsert({ user_id: context.userId, url: data.url, db: data.db, username: data.login, api_key: data.api_key, status: "connected", status_message: null, last_tested_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncOdoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row } = await context.supabase.from("odoo_connections").select("url, db, username, api_key").eq("user_id", context.userId).maybeSingle();
    if (!row) throw new Error("Aucune connexion Odoo configurée dans le Laboratoire.");
    const snap = computeSnapshot(await fetchRaw(normalize({ url: row.url, db: row.db, login: row.username, api_key: row.api_key })));
    const { error } = await pls(context.supabase).from("pls_kpi_snapshots").insert({ user_id: context.userId, source: "odoo", data: snap as unknown as Json });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loadDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snap = computeSnapshot(demoRaw());
    const { error } = await pls(context.supabase).from("pls_kpi_snapshots").insert({ user_id: context.userId, source: "demo", data: snap as unknown as Json });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- AI analyst ----------
const HIGHLIGHT_IDS = ["health", "chart-monthly", "top-customers", "top-products", "top-suppliers", "receivables", "payables"];

export const askDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string }) => {
    const q = (d.question ?? "").trim();
    if (!q || q.length > 1000) throw new Error("Question invalide.");
    return { question: q };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: snapRow } = await pls(supabase).from("pls_kpi_snapshots").select("data").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!snapRow) throw new Error("Aucune donnée : connectez Odoo ou chargez la démo.");
    const snap = snapRow.data as unknown as Snapshot;
    const { data: hist } = await pls(supabase).from("pls_chat_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(6);

    await pls(supabase).from("pls_chat_messages").insert({ user_id: userId, role: "user", content: data.question });

    const ids = [...HIGHLIGHT_IDS, ...snap.kpis.map((k) => k.id)];
    const compact = {
      societe: snap.company,
      devise: snap.currency,
      score_sante: snap.health,
      kpis: snap.kpis.map((k) => ({ id: k.id, label: k.label, valeur: Math.round(k.value * 1000) / 1000, format: k.format })),
      ventes_achats_mensuels: snap.monthly,
      top_clients: snap.topCustomers,
      top_produits: snap.topProducts,
      top_fournisseurs: snap.topSuppliers,
      creances: snap.receivables,
      dettes: snap.payables,
      pipeline: snap.pipeline,
    };
    const instructions = `Tu es l'analyste financier vocal d'un tableau de bord Odoo. Réponds en français, à l'oral : 2 à 4 phrases courtes, chiffres arrondis, sans markdown ni listes. Interprète les données, explique le "pourquoi" et termine par une recommandation actionnable pour la croissance. Pour chaque donnée citée, ajoute son identifiant dans "highlights" avec un ton : positive (bon), warning (à surveiller), critical (problème), info (neutre). Identifiants autorisés : ${ids.join(", ")}. Données : ${JSON.stringify(compact)}`;

    const input = [
      ...(hist ?? []).reverse().map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      { role: "user", content: data.question },
    ];

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Service IA non configuré.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: await resolveAppAiModel(supabase, userId, "pulse"),
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: "answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["answer", "highlights"],
              properties: {
                answer: { type: "string" },
                highlights: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "tone"],
                    properties: { id: { type: "string", enum: ids }, tone: { type: "string", enum: ["positive", "warning", "critical", "info"] } },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de requêtes IA, réessayez dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés. Rechargez votre espace de travail.");
      throw new Error(`Erreur IA (${res.status}) ${t.slice(0, 200)}`);
    }
    // Consume SSE stream, collect output text deltas.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } } };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
          if (ev.type === "response.failed") throw new Error(ev.response?.error?.message ?? "Réponse IA échouée");
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Réponse")) throw e;
        }
      }
    }
    let out: { answer: string; highlights: { id: string; tone: string }[] };
    try {
      out = JSON.parse(text);
    } catch {
      throw new Error("Réponse IA illisible.");
    }
    await pls(supabase).from("pls_chat_messages").insert({ user_id: userId, role: "assistant", content: out.answer, highlights: out.highlights as unknown as Json });
    return out;
  });
