import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pst } from "./db";

/** Checks the saved Odoo credentials and which required modules are reachable. */
export const testOdoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { odooClient, REQUIRED_SCOPES } = await import("./odoo.server");
    const { data: agent } = await pst(context.supabase).from("pst_agents").select("*").eq("owner_id", context.userId).maybeSingle();
    const { data: conn } = await context.supabase.from("odoo_connections").select("url, db, username, api_key").eq("user_id", context.userId).maybeSingle();
    if (!agent || !conn?.url) return { ok: false, error: "Renseignez d'abord la connexion Odoo dans les paramètres du Laboratoire.", scopes: [] };
    const odoo = odooClient({ url: conn.url, db: conn.db, login: conn.username, apiKey: conn.api_key });
    try {
      await odoo.login();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connexion impossible", scopes: [] };
    }
    const scopes = await Promise.all(
      REQUIRED_SCOPES.map(async (s) => {
        const model = s.model === "helpdesk.ticket" ? agent.ticket_model : s.model;
        const op = s.rights.includes("Lecture") ? "read" : "create";
        try {
          const ok = await odoo.call<boolean>(model, "check_access_rights", [op], { raise_exception: false });
          return { model, ok: Boolean(ok) };
        } catch {
          return { model, ok: false };
        }
      }),
    );
    return { ok: true, error: null, scopes };
  });

/** AI summary of a call (Lovable AI), saved on the call row. */
export const analyzeCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: call } = await pst(context.supabase).from("pst_calls").select("id, transcript, actions").eq("id", data.callId).maybeSingle();
    if (!call) throw new Error("Appel introuvable");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const key = process.env["LOVABLE_API_KEY"] ?? "";
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses(await resolveAppAiModel(context.supabase, context.userId, "pulsesupport")),
      maxRetries: 0,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      system:
        "Tu analyses un appel du support client. Réponds en français, en 4 lignes max : 1) Motif, 2) Résolution, 3) Satisfaction estimée (😊/😐/😟), 4) Action recommandée pour l'équipe.",
      prompt: `Transcription :\n${call.transcript.slice(0, 20000)}\n\nActions Odoo : ${JSON.stringify(call.actions).slice(0, 4000)}`,
    });
    let failed = false;
    for await (const part of result.fullStream) if (part.type === "error") failed = true;
    const summary = (await result.text).trim();
    if (failed || !summary) throw new Error("L'analyse IA a échoué. Réessayez plus tard.");
    await pst(context.supabase).from("pst_calls").update({ ai_summary: summary }).eq("id", call.id);
    return { summary };
  });
