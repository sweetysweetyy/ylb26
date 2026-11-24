import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY manquant");
  return k;
}

async function chat(model: string, messages: any[], responseJson = false) {
  const body: any = { model, messages };
  if (responseJson) body.response_format = { type: "json_object" };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${t}`);
  }
  const json = await res.json();
  return json.choices[0]?.message?.content ?? "";
}

const settingsShape = z.object({
  industry: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
  brand_voice: z.string().nullable().optional(),
  personal_bio: z.string().nullable().optional(),
  content_pillars: z.array(z.string()).nullable().optional(),
  language: z.string().nullable().optional(),
});

/* ============ IDEAS ============ */
export const generateIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ count: z.number().min(1).max(12).default(6), focus: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase.from("cml_settings").select("*").eq("user_id", userId).maybeSingle();
    const settings = settingsShape.parse(s ?? {});
    const model = (s as any)?.ideas_model || "google/gemini-2.5-flash";

    const sys = `Tu es un stratège LinkedIn de très haut niveau, spécialiste des tendances B2B et de l'algorithme LinkedIn 2026.
Tu génères des idées de posts virales, adaptées au domaine et à l'audience cible.
Tu maîtrises: hooks (dwell-time), storytelling, contrarian takes, carrousels, sondages, tendances émergentes.
Sortie STRICTEMENT en JSON valide.`;

    const user = `Configuration utilisateur:
${JSON.stringify(settings, null, 2)}

${data.focus ? `Angle demandé: ${data.focus}` : ""}

Génère ${data.count} idées de posts LinkedIn tendances, pertinentes, actuelles.
Chaque idée doit avoir:
- title: titre court accrocheur
- angle: type de post (contrarian / storytelling / framework / data / question / retour d'expérience / hot take)
- hook: la 1ère ligne du post (max 12 mots, ultra-scroll-stopping)
- rationale: pourquoi ça marchera (dwell time, saves, algorithme)
- trend_score: 0-100 (potentiel de reach immédiat)
- tags: 3-5 mots clés

Réponds en JSON: {"ideas":[{"title":"","angle":"","hook":"","rationale":"","trend_score":0,"tags":[]}]}
Langue: ${settings.language ?? "fr"}.`;

    const raw = await chat(model, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], true);

    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { ideas: [] };
    }
    const ideas = (parsed.ideas ?? []).slice(0, data.count);

    if (ideas.length) {
      const rows = ideas.map((i: any) => ({
        user_id: userId,
        title: String(i.title ?? "").slice(0, 240),
        angle: i.angle ?? null,
        hook: i.hook ?? null,
        rationale: i.rationale ?? null,
        trend_score: Number(i.trend_score) || 0,
        tags: Array.isArray(i.tags) ? i.tags : [],
      }));
      await supabase.from("cml_ideas").insert(rows);
    }
    return { count: ideas.length };
  });

/* ============ WRITE POST ============ */
export const writePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      ideaId: z.string().uuid().optional(),
      customBrief: z.string().optional(),
      length: z.enum(["short", "medium", "long"]).default("medium"),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase.from("cml_settings").select("*").eq("user_id", userId).maybeSingle();
    const settings = settingsShape.parse(s ?? {});
    const model = (s as any)?.writing_model || "openai/gpt-5.4";

    let idea: any = null;
    if (data.ideaId) {
      const { data: i } = await supabase.from("cml_ideas").select("*").eq("id", data.ideaId).maybeSingle();
      idea = i;
    }

    const targetLen = { short: "80-120 mots", medium: "180-260 mots", long: "300-500 mots" }[data.length];
    const pref: any = (s as any)?.post_structure_pref ?? {};
    const structureMap: Record<string, string> = {
      hook_story_cta: "Hook → Story personnelle → Leçon → CTA question",
      problem_solution_cta: "Problème client → Insight → Solution → CTA",
      framework_steps: "Hook → Framework nommé → Étapes numérotées courtes → CTA",
      contrarian_proof: "Prise de position contrarian → Preuve/data → Insight → CTA",
      data_insight_action: "Chiffre choc → Insight → Action concrète → CTA",
      custom: pref.custom || "Hook → Story → CTA",
    };
    const structureRule = structureMap[pref.structure ?? "hook_story_cta"];
    const emojiRule = ({ none: "0 emoji", moderate: "max 2-3 emojis stratégiques", rich: "4-6 emojis expressifs" } as Record<string, string>)[pref.emojis ?? "moderate"];
    const maxLine = pref.max_line ?? 12;

    const sys = `Tu es le meilleur ghostwriter LinkedIn au monde. Tu maîtrises l'algorithme LinkedIn 2026 mieux que personne.
STRUCTURE OBLIGATOIRE: ${structureRule}
RÈGLES DE L'ALGORITHME (à respecter absolument):
- Hook impactant en ligne 1 (choc, chiffre, contrarian, promesse) — max 12 mots
- Ligne 2 vide pour créer le "voir plus"
- Phrases courtes (max ${maxLine} mots par ligne)
- Beaucoup de sauts de ligne (respiration = dwell time)
- Story-driven ou framework-driven (pas de listicles génériques)
- CTA final ouvrant une conversation (question ouverte)
- 3-5 hashtags pertinents en fin
- Emojis: ${emojiRule}
- Vocabulaire du domaine de l'utilisateur
- Ton natif, humain, personnel

Sortie STRICTEMENT en JSON: {"title":"","hook":"","content":"","hashtags":[]}`;

    const user = `Config utilisateur:
${JSON.stringify(settings, null, 2)}

${idea ? `Idée sélectionnée:\n${JSON.stringify(idea, null, 2)}` : ""}
${data.customBrief ? `Brief libre: ${data.customBrief}` : ""}

Longueur cible: ${targetLen}
Langue: ${settings.language ?? "fr"}

Rédige LE post LinkedIn. Le champ "content" doit être le post complet avec sauts de ligne (\\n), prêt à copier-coller.`;

    const raw = await chat(model, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], true);

    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { title: "", hook: "", content: raw, hashtags: [] };
    }

    const { data: post, error } = await supabase.from("cml_posts").insert({
      user_id: userId,
      idea_id: data.ideaId ?? null,
      title: parsed.title ?? null,
      hook: parsed.hook ?? null,
      content: parsed.content ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      status: "draft",
    }).select().single();
    if (error) throw new Error(error.message);

    if (data.ideaId) {
      await supabase.from("cml_ideas").update({ used: true }).eq("id", data.ideaId);
    }
    return post;
  });

/* ============ GENERATE IMAGE ============ */
export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      postId: z.string().uuid().optional(),
      prompt: z.string().min(3),
      style: z.string().optional(),
      mood: z.string().optional(),
      aspectRatio: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
      background: z.enum(["auto", "transparent", "opaque"]).default("auto"),
      model: z.enum(["openai/gpt-image-2.5-sunburst", "openai/gpt-image-2", "openai/gpt-image-1-mini"]).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase.from("cml_settings").select("image_model, brand_voice, industry").eq("user_id", userId).maybeSingle();
    const model = data.model || (s as any)?.image_model || "openai/gpt-image-2.5-sunburst";

    const fullPrompt = [
      data.prompt,
      data.style ? `Style: ${data.style}.` : "",
      data.mood ? `Ambiance: ${data.mood}.` : "",
      (s as any)?.industry ? `Contexte pro: ${(s as any).industry}.` : "",
      "Composition premium, éclairage cinématique, adapté au feed LinkedIn, sans texte lisible.",
    ].filter(Boolean).join(" ");

    const res = await fetch(`${GATEWAY}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        size: data.aspectRatio,
        quality: data.quality,
        background: data.background,
        n: 1,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Image API ${res.status}: ${t}`);
    }
    const json = await res.json();
    const item = json.data?.[0] ?? {};
    const b64 = item.b64_json;
    const url = item.url;
    const imageDataUrl = b64 ? `data:image/png;base64,${b64}` : url;

    if (data.postId) {
      await supabase.from("cml_posts").update({
        image_url: imageDataUrl,
        image_prompt: fullPrompt,
        image_config: {
          style: data.style, mood: data.mood, aspectRatio: data.aspectRatio,
          quality: data.quality, background: data.background, model,
        },
      }).eq("id", data.postId).eq("user_id", userId);
    }

    return { image: imageDataUrl, prompt: fullPrompt };
  });

/* ============ CAROUSEL GENERATOR ============ */
export const generateCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      topic: z.string().min(3),
      slides: z.number().min(4).max(12).default(8),
      postId: z.string().uuid().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase.from("cml_settings").select("*").eq("user_id", userId).maybeSingle();
    const model = (s as any)?.writing_model || "openai/gpt-5.4";

    const sys = `Tu conçois des carrousels LinkedIn haut de gamme qui génèrent des saves et des partages.
Règles: slide 1 = hook irrésistible, slides intermédiaires = 1 idée par slide (titre court + 1-2 phrases max), avant-dernière = récap, dernière = CTA.
Texte ultra concis (max 18 mots par slide hors titre). Sortie JSON strict.`;
    const user = `Sujet: ${data.topic}
Profil: ${JSON.stringify({ industry: (s as any)?.industry, niche: (s as any)?.niche, audience: (s as any)?.target_audience, tone: (s as any)?.tone }, null, 2)}
Nombre de slides: ${data.slides}. Langue: ${(s as any)?.language ?? "fr"}.
JSON attendu: {"title":"","caption":"","slides":[{"headline":"","body":"","kicker":""}],"hashtags":[]}`;

    const raw = await chat(model, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], true);
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { title: data.topic, slides: [] };
    }

    const { data: row, error } = await supabase.from("cml_carousels").insert({
      user_id: userId,
      post_id: data.postId ?? null,
      title: parsed.title ?? data.topic,
      slides: parsed.slides ?? [],
      theme: { caption: parsed.caption ?? "", hashtags: parsed.hashtags ?? [] },
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });
