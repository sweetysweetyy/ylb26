import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { drawSlide, reason } from "./ai.server";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { csl } from "../types";

export type Settings = {
  tone: string;
  stroke: string;
  palette: string;
  audience: string;
  language: string;
};

export const defaultSettings: Settings = {
  tone: "Ludique et chaleureux",
  stroke: "Feutre griffonné",
  palette: "Terre & crème",
  audience: "Grand public curieux",
  language: "Français",
};

const settingsSchema = z.object({
  tone: z.string().min(1).max(60),
  stroke: z.string().min(1).max(60),
  palette: z.string().min(1).max(60),
  audience: z.string().min(1).max(80),
  language: z.string().min(1).max(40),
});

/** 1. Recherche d'idées tendance — GPT 5.6 Sol */
export const searchIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ topic: z.string().min(2).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const model = await resolveAppAiModel(context.supabase, context.userId, "coussel");
    const result = await reason<{ ideas?: { title?: string; angle?: string }[] }>(
      model,
      "Tu es un stratège de contenu social. Tu proposes des angles de carrousels actuels, vérifiables et appuyés sur des sources fiables (études, institutions, presse de référence). Format: {\"ideas\":[{\"title\":string,\"angle\":string}]} avec exactement 5 idées.",
      `Sujet: ${data.topic}. Propose 5 idées de carrousels tendance, chacune avec un titre court et un angle en une phrase.`,
    );
    return {
      ideas: (result.ideas ?? [])
        .slice(0, 5)
        .map((i) => ({ title: String(i.title ?? "").trim(), angle: String(i.angle ?? "").trim() }))
        .filter((i) => i.title),
    };
  });

/** 2. Construction de la logique du carrousel (5 slides) — GPT 5.6 Sol */
export const planCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(200),
        idea: z.string().min(2).max(300),
        settings: settingsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = csl(context.supabase);
    const s = data.settings;

    const model = await resolveAppAiModel(context.supabase, userId, "coussel");
    const plan = await reason<{
      title?: string;
      sources?: { label?: string; url?: string }[];
      slides?: { role?: string; headline?: string; body?: string; visual?: string }[];
    }>(
      model,
      `Tu construis la logique complète d'un carrousel social de 5 slides, en ${s.language}.
Structure obligatoire: 1) accroche, 2) contexte/problème, 3) explication clé, 4) preuve ou exemple, 5) conclusion + appel à l'action.
Chaque slide: headline (max 8 mots), body (max 30 mots), visual (description en anglais d'un dessin manuscrit simple, sans texte dans l'image).
Appuie-toi sur des faits vérifiables et cite 3 sources fiables (institution, étude, presse de référence) avec URL plausible.
Format JSON: {"title":string,"sources":[{"label":string,"url":string}],"slides":[{"role":string,"headline":string,"body":string,"visual":string}]}`,
      `Sujet: ${data.topic}
Idée retenue: ${data.idea}
Ton: ${s.tone}
Public: ${s.audience}
Style de trait: ${s.stroke}
Palette: ${s.palette}`,
    );

    const slides = (plan.slides ?? []).slice(0, 5);
    if (slides.length < 5) throw new Error("La logique du carrousel est incomplète, réessayez.");

    const { data: carousel, error } = await supabase
      .from("csl_carousels")
      .insert({
        user_id: userId,
        topic: data.topic,
        idea: data.idea,
        title: plan.title?.slice(0, 120) || data.idea.slice(0, 120),
        settings: s,
        sources: (plan.sources ?? []).slice(0, 3),
        status: "planned",
      })
      .select("id")
      .single();
    if (error || !carousel) throw new Error(error?.message ?? "Enregistrement impossible");

    const rows = slides.map((slide, index) => ({
      carousel_id: carousel.id,
      user_id: userId,
      position: index + 1,
      role: slide.role ?? null,
      headline: slide.headline ?? null,
      body: slide.body ?? null,
      visual_prompt: slide.visual ?? null,
      status: "pending",
    }));
    const { error: slidesError } = await supabase.from("csl_slides").insert(rows);
    if (slidesError) throw new Error(slidesError.message);

    return { carouselId: carousel.id as string };
  });

/** 3. Dessin d'une slide — GPT image 2, piloté par le plan de GPT 5.6 Sol */
export const renderSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slideId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = csl(context.supabase);

    const { data: slide, error } = await supabase
      .from("csl_slides")
      .select("id, carousel_id, position, headline, body, visual_prompt, image_url")
      .eq("id", data.slideId)
      .single();
    if (error || !slide) throw new Error("Slide introuvable");
    if (slide.image_url) return { path: slide.image_url as string };

    const { data: carousel } = await supabase
      .from("csl_carousels")
      .select("settings")
      .eq("id", slide.carousel_id)
      .single();
    const s = { ...defaultSettings, ...((carousel?.settings as Partial<Settings>) ?? {}) };

    await supabase.from("csl_slides").update({ status: "drawing" }).eq("id", slide.id);

    try {
      const prompt = [
        `Hand-drawn sketchbook illustration for a social media carousel slide ${slide.position} of 5.`,
        `Scene: ${slide.visual_prompt ?? slide.headline ?? "simple doodle"}.`,
        `Handwritten note in ${s.language} at the top reading exactly: "${slide.headline ?? ""}".`,
        `A short handwritten caption underneath reading exactly: "${slide.body ?? ""}".`,
        `Style: ${s.stroke}, playful hand-drawn doodles and arrows, handwritten lettering, ${s.palette} colour palette, cream paper texture, generous margins, no photo realism, no watermark.`,
      ].join(" ");

      const b64 = await drawSlide(prompt);
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${userId}/${slide.carousel_id}/${slide.position}.png`;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: uploadError } = await supabaseAdmin.storage
        .from("coussel-slides")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      await supabase.from("csl_slides").update({ image_url: path, status: "done" }).eq("id", slide.id);

      const { count } = await supabase
        .from("csl_slides")
        .select("id", { count: "exact", head: true })
        .eq("carousel_id", slide.carousel_id)
        .neq("status", "done");
      if (!count) {
        await supabase
          .from("csl_carousels")
          .update({ status: "done", error: null })
          .eq("id", slide.carousel_id);
      }

      return { path };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Génération impossible";
      await supabase.from("csl_slides").update({ status: "error" }).eq("id", slide.id);
      await supabase
        .from("csl_carousels")
        .update({ status: "error", error: message })
        .eq("id", slide.carousel_id);
      throw new Error(message);
    }
  });
