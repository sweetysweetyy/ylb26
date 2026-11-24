import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Rafraîchit la veille de tendances à la demande. */
export const refreshTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { crawlTrends } = await import("@/cml/lib/trends.server");
    return await crawlTrends(supabaseAdmin);
  });

/** Transforme une tendance en idée de post personnalisée. */
export const trendToIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ trendId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: t } = await supabase.from("cml_trends").select("*").eq("id", data.trendId).maybeSingle();
    if (!t) throw new Error("Tendance introuvable");
    const { data: s } = await supabase.from("cml_settings").select("*").eq("user_id", userId).maybeSingle();

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: (s as any)?.ideas_model || "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Tu es stratège LinkedIn. Tu transformes une actualité en angle de post ultra pertinent pour un profil donné. Réponds en JSON strict." },
          {
            role: "user",
            content: `Actualité: ${t.title}\n${t.summary ?? ""}\nSource: ${t.source}\n\nProfil: ${JSON.stringify({ industry: s?.industry, niche: s?.niche, audience: s?.target_audience, tone: s?.tone }, null, 2)}\n\nJSON attendu: {"title":"","angle":"","hook":"","rationale":"","trend_score":0,"tags":[]} — langue ${s?.language ?? "fr"}.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI Gateway ${res.status}`);
    const j = await res.json();
    let idea: any = {};
    try { idea = JSON.parse(j.choices[0].message.content); } catch { idea = {}; }

    const { data: row, error } = await supabase.from("cml_ideas").insert({
      user_id: userId,
      title: String(idea.title ?? t.title).slice(0, 240),
      angle: idea.angle ?? "actualité",
      hook: idea.hook ?? null,
      rationale: idea.rationale ?? null,
      trend_score: Number(idea.trend_score) || t.score,
      tags: Array.isArray(idea.tags) ? idea.tags : (t.keywords ?? []),
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });
