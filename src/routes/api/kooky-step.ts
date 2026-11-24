import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toKyConn, type Database, type KyConn } from "@/kooky/types";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { authenticateRequest } from "@/kooky/lib/request-auth.server";
import {
  ANALYSIS_INSTRUCTIONS,
  DISCOVERY_INSTRUCTIONS,
  analysisSchema,
  discoverySchema,
  kookyCall,
  parseJson,
  type Analysis,
  type Discovery,
} from "@/kooky/lib/kooky-ai.server";
import { OdooClient } from "@/kooky/lib/odoo.server";
import { markdownToHtml } from "@/kooky/lib/markdown";

type DB = SupabaseClient<Database>;
type Lead = Database["public"]["Tables"]["ky_leads"]["Row"];
type Search = Database["public"]["Tables"]["ky_lead_searches"]["Row"];
type Conn = KyConn;

type AiCfg = { apiKey: string; model: string };
type Emit = (e: Record<string, unknown>) => void;

/**
 * One pipeline step for a search. Streams NDJSON progress events.
 *  - no leads yet  → discovery (find N companies)
 *  - pending lead  → deep analysis + push to Odoo
 *  - nothing left  → mark search done
 * Body: { searchId, leadId? } — leadId forces re-processing of that lead.
 */
export const Route = createFileRoute("/api/kooky-step")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("LOVABLE_API_KEY manquante", { status: 500 });

        const body = (await request.json().catch(() => ({}))) as { searchId?: string; leadId?: string };
        if (!body.searchId) return new Response("searchId requis", { status: 400 });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let closed = false;
            const emit: Emit = (e) => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
              } catch {
                closed = true;
              }
            };
            const heartbeat = setInterval(() => emit({ type: "ping" }), 8000);
            try {
              const model = await resolveAppAiModel(auth.supabase, auth.userId, "kooky");
              const result = await runStep(auth.supabase, { apiKey, model }, body.searchId!, body.leadId, emit, request.signal);
              emit({ type: "done", ...result });
            } catch (err) {
              emit({ type: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
            } finally {
              clearInterval(heartbeat);
              closed = true;
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            }
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});

async function runStep(
  db: DB,
  ai: AiCfg,
  searchId: string,
  leadId: string | undefined,
  emit: Emit,
  signal: AbortSignal,
): Promise<{ next: boolean; remaining: number }> {
  const { data: search, error: sErr } = await db.from("ky_lead_searches").select("*").eq("id", searchId).single();
  if (sErr || !search) throw new Error("Recherche introuvable.");
  const { data: connRow } = await db.from("odoo_connections").select("*").maybeSingle();
  const conn = toKyConn(connRow);

  const { data: leads } = await db.from("ky_leads").select("*").eq("search_id", searchId).order("position");
  const all = leads ?? [];

  // 1) Discovery
  if (all.length === 0 && !leadId) {
    await db.from("ky_lead_searches").update({ status: "discovering", error: null }).eq("id", searchId);
    const inserted = await discover(db, ai, search, emit, signal);
    await db.from("ky_lead_searches").update({ status: "analyzing" }).eq("id", searchId);
    return { next: inserted > 0, remaining: inserted };
  }

  // 2) Pick the lead to process
  let lead: Lead | undefined = leadId
    ? all.find((l) => l.id === leadId)
    : all.find((l) => l.status === "pending" || l.status === "analyzing");
  if (!lead && !leadId) {
    // retry leads that failed analysis once? No — leave them for manual retry.
    lead = undefined;
  }

  if (lead) {
    if (search.status !== "analyzing") await db.from("ky_lead_searches").update({ status: "analyzing" }).eq("id", searchId);
    const needsAnalysis = !lead.analysis || lead.status === "pending" || lead.status === "analyzing" || lead.status === "error";
    if (needsAnalysis) lead = await analyze(db, ai, search, lead, emit, signal);
    if (lead.status === "analyzed" || lead.status === "odoo_error") {
      await pushToOdoo(db, conn, lead, emit);
    }
  }

  const { data: after } = await db.from("ky_leads").select("status").eq("search_id", searchId);
  const remaining = (after ?? []).filter((l) => l.status === "pending" || l.status === "analyzing").length;
  if (remaining === 0) {
    await db.from("ky_lead_searches").update({ status: "done" }).eq("id", searchId);
  }
  return { next: remaining > 0 && !leadId, remaining };
}

async function discover(db: DB, ai: AiCfg, search: Search, emit: Emit, signal: AbortSignal) {
  emit({ type: "status", message: `Analyse de la demande et recherche de ${search.target_count} prospects…` });

  const { data: known } = await db
    .from("ky_leads")
    .select("company_name")
    .eq("user_id", search.user_id)
    .order("created_at", { ascending: false })
    .limit(150);
  const exclude = Array.from(new Set((known ?? []).map((k) => k.company_name)));

  const input = [
    `Secteur d'activité : ${search.sector}`,
    search.location ? `Zone géographique : ${search.location}` : "Zone géographique : non précisée (déduis-la du contexte, sinon France/francophonie)",
    `Nombre de prospects à trouver : ${search.target_count}`,
    search.brief ? `Précisions de l'utilisateur : ${search.brief}` : "",
    exclude.length ? `Entreprises déjà connues à exclure : ${exclude.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await kookyCall({
    apiKey: ai.apiKey,
    model: ai.model,
    instructions: DISCOVERY_INSTRUCTIONS,
    input,
    effort: "medium",
    schema: discoverySchema,
    webSearch: true,
    signal,
    onEvent: (e) => {
      if (e.type === "thinking") emit({ type: "thinking", text: e.text });
      if (e.type === "search") emit({ type: "search", query: e.query });
    },
  });
  const parsed = parseJson<Discovery>(text);
  const companies = (parsed.companies ?? []).slice(0, search.target_count);
  if (companies.length === 0) throw new Error("Aucune entreprise trouvée pour cette demande.");

  const rows = companies.map((c, i) => ({
    search_id: search.id,
    user_id: search.user_id,
    company_name: c.name,
    website: c.website,
    city: c.city,
    country: c.country,
    summary: c.reason,
    sector: search.sector,
    position: i,
    status: "pending",
  }));
  const { error } = await db.from("ky_leads").insert(rows);
  if (error) throw new Error(error.message);
  emit({ type: "status", message: `${companies.length} entreprises identifiées. Début des analyses approfondies.` });
  return companies.length;
}

async function analyze(db: DB, ai: AiCfg, search: Search, lead: Lead, emit: Emit, signal: AbortSignal): Promise<Lead> {
  await db.from("ky_leads").update({ status: "analyzing", error: null }).eq("id", lead.id);
  emit({ type: "status", leadId: lead.id, message: `Analyse approfondie de ${lead.company_name}…` });

  const input = [
    `Entreprise à analyser : ${lead.company_name}`,
    lead.website ? `Site web présumé : ${lead.website}` : "",
    lead.city || lead.country ? `Localisation présumée : ${[lead.city, lead.country].filter(Boolean).join(", ")}` : "",
    `Contexte de prospection : secteur "${search.sector}"${search.location ? `, zone "${search.location}"` : ""}.`,
    search.brief ? `Objectif de l'utilisateur : ${search.brief}` : "",
    lead.summary ? `Pourquoi cette entreprise a été présélectionnée : ${lead.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const text = await kookyCall({
      apiKey: ai.apiKey,
      model: ai.model,
      instructions: ANALYSIS_INSTRUCTIONS,
      input,
      effort: "high",
      schema: analysisSchema,
      webSearch: true,
      signal,
      onEvent: (e) => {
        if (e.type === "thinking") emit({ type: "thinking", leadId: lead.id, text: e.text });
        if (e.type === "search") emit({ type: "search", leadId: lead.id, query: e.query });
      },
    });
    const a = parseJson<Analysis>(text);
    const update = {
      company_name: a.company_name || lead.company_name,
      website: a.website ?? lead.website,
      email: a.email,
      phone: a.phone,
      street: a.street,
      city: a.city ?? lead.city,
      zip: a.zip,
      country: a.country ?? lead.country,
      sector: a.sector ?? lead.sector,
      company_size: a.company_size,
      summary: a.summary,
      analysis: a.analysis,
      approach: a.approach,
      score: Math.max(0, Math.min(100, Math.round(a.score ?? 0))),
      contacts: a.contacts ?? [],
      sources: a.sources ?? [],
      status: "analyzed",
      error: null,
    };
    const { data, error } = await db.from("ky_leads").update(update).eq("id", lead.id).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Sauvegarde impossible");
    emit({ type: "status", leadId: lead.id, message: `Dossier ${data.company_name} terminé (score ${data.score}/100).` });
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analyse échouée";
    await db.from("ky_leads").update({ status: "error", error: message }).eq("id", lead.id);
    emit({ type: "status", leadId: lead.id, message: `Échec de l'analyse : ${message}` });
    return { ...lead, status: "error", error: message };
  }
}

function buildReportHtml(lead: Lead) {
  const contacts = (lead.contacts as Analysis["contacts"]) ?? [];
  const sources = (lead.sources as Analysis["sources"]) ?? [];
  const parts = [
    `<h2>🧠 Dossier KOOKY — ${lead.company_name}</h2>`,
    `<p><strong>Score de pertinence :</strong> ${lead.score ?? "–"}/100 · <strong>Taille :</strong> ${lead.company_size ?? "n/c"} · <strong>Secteur :</strong> ${lead.sector ?? "n/c"}</p>`,
    `<p>${markdownToHtml(lead.summary ?? "")}</p>`,
    contacts.length
      ? `<h3>Décideurs identifiés</h3><ul>${contacts
          .map(
            (c) =>
              `<li><strong>${c.name}</strong>${c.role ? ` — ${c.role}` : ""}${c.email ? ` · ${c.email}` : ""}${c.phone ? ` · ${c.phone}` : ""}${c.linkedin ? ` · <a href="${c.linkedin}">LinkedIn</a>` : ""}</li>`,
          )
          .join("")}</ul>`
      : "",
    `<h2>Analyse détaillée</h2>`,
    markdownToHtml(lead.analysis ?? ""),
    `<h2>Plan d'approche recommandé</h2>`,
    markdownToHtml(lead.approach ?? ""),
    sources.length
      ? `<h3>Sources consultées</h3><ul>${sources.map((s) => `<li><a href="${s.url}">${s.title}</a></li>`).join("")}</ul>`
      : "",
    `<p><em>Généré par KOOKY le ${new Date().toLocaleDateString("fr-FR")}.</em></p>`,
  ];
  return parts.filter(Boolean).join("\n");
}

async function pushToOdoo(db: DB, conn: Conn | null, lead: Lead, emit: Emit) {
  if (!conn) {
    await db.from("ky_leads").update({ status: "odoo_error", error: "Aucune connexion Odoo configurée." }).eq("id", lead.id);
    emit({ type: "status", leadId: lead.id, message: "Odoo non connecté : dossier conservé dans KOOKY." });
    return;
  }
  await db.from("ky_leads").update({ status: "syncing" }).eq("id", lead.id);
  emit({ type: "status", leadId: lead.id, message: `Envoi de ${lead.company_name} dans Odoo CRM…` });
  const odoo = new OdooClient({ url: conn.url, db: conn.db_name, login: conn.login, apiKey: conn.api_key });
  const contacts = (lead.contacts as Analysis["contacts"]) ?? [];
  const html = buildReportHtml(lead);

  try {
    const countryId = await odoo.findCountryId(lead.country);
    const partnerVals: Record<string, unknown> = {
      name: lead.company_name,
      is_company: true,
      website: lead.website || false,
      email: lead.email || false,
      phone: lead.phone || false,
      street: lead.street || false,
      city: lead.city || false,
      zip: lead.zip || false,
      country_id: countryId,
      comment: html,
    };

    // Company (res.partner) — reuse if it already exists
    let partnerId = lead.odoo_partner_id;
    if (!partnerId) {
      const existing = await odoo.call<number[]>("res.partner", "search", [[["name", "=ilike", lead.company_name], ["is_company", "=", true]]], { limit: 1 });
      partnerId = existing[0] ?? null;
    }
    if (partnerId) {
      await odoo.call("res.partner", "write", [[partnerId], partnerVals]);
    } else {
      partnerId = await odoo.call<number>("res.partner", "create", [partnerVals]);
    }

    // Decision makers as child contacts
    for (const c of contacts.slice(0, 6)) {
      if (!c.name) continue;
      const dup = await odoo.call<number[]>("res.partner", "search", [[["name", "=ilike", c.name], ["parent_id", "=", partnerId]]], { limit: 1 });
      if (dup.length) continue;
      await odoo.call("res.partner", "create", [
        {
          name: c.name,
          parent_id: partnerId,
          type: "contact",
          function: c.role || false,
          email: c.email || false,
          phone: c.phone || false,
          comment: c.linkedin ? `LinkedIn : ${c.linkedin}` : false,
        },
      ]);
    }

    // Opportunity (crm.lead) with full report in the notes section + chatter note
    const tagId = await odoo.ensureTag("KOOKY");
    const first = contacts[0];
    const score = lead.score ?? 0;
    const leadVals: Record<string, unknown> = {
      name: `${lead.company_name} — Prospect KOOKY`,
      type: "opportunity",
      partner_id: partnerId,
      email_from: lead.email || false,
      phone: lead.phone || false,
      website: lead.website || false,
      street: lead.street || false,
      city: lead.city || false,
      zip: lead.zip || false,
      country_id: countryId,
      contact_name: first?.name || false,
      function: first?.role || false,
      priority: score >= 75 ? "3" : score >= 50 ? "2" : score >= 25 ? "1" : "0",
      description: html,
      ...(tagId ? { tag_ids: [[6, 0, [tagId]]] } : {}),
    };
    let odooLeadId = lead.odoo_lead_id;
    if (odooLeadId) {
      await odoo.call("crm.lead", "write", [[odooLeadId], leadVals]);
    } else {
      odooLeadId = await odoo.call<number>("crm.lead", "create", [leadVals]);
      try {
        await odoo.call("crm.lead", "message_post", [[odooLeadId]], {
          body: html,
          message_type: "comment",
          subtype_xmlid: "mail.mt_note",
        });
      } catch {
        /* chatter note is best-effort */
      }
    }

    await db
      .from("ky_leads")
      .update({ status: "synced", error: null, odoo_partner_id: partnerId, odoo_lead_id: odooLeadId })
      .eq("id", lead.id);
    emit({ type: "status", leadId: lead.id, message: `${lead.company_name} ajouté dans Odoo (opportunité #${odooLeadId}).` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Odoo";
    await db.from("ky_leads").update({ status: "odoo_error", error: message }).eq("id", lead.id);
    emit({ type: "status", leadId: lead.id, message: `Erreur Odoo pour ${lead.company_name} : ${message}` });
  }
}
