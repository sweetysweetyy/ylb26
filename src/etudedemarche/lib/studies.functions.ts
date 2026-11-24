/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeBrief, runStudy } from "./study-engine.server";

export const createStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ brief: z.string().min(20).max(6000), model: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const supabase = context.supabase as any;
    const { data: settings } = await supabase
      .from("edm_settings")
      .select("model")
      .eq("user_id", userId)
      .maybeSingle();
    void settings;
    const model = data.model ?? (await (await import("@/lib/ai-models.server")).resolveAppAiModel(supabase, userId, "etudedemarche"));

    const { data: created, error } = await supabase
      .from("edm_studies")
      .insert({
        user_id: userId,
        brief: data.brief,
        model,
        status: "analyzing",
        title: data.brief.slice(0, 60),
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Création impossible.");

    try {
      const { analysis } = await analyzeBrief(supabase, userId, data.brief, model);
      await supabase
        .from("edm_studies")
        .update({
          analysis: analysis as unknown as never,
          status: "analyzed",
          progress: 5,
          title: analysis.titre_suggere || data.brief.slice(0, 60),
        })
        .eq("id", created.id);
      return { studyId: created.id, analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analyse impossible.";
      await supabase.from("edm_studies").update({ status: "failed", error: message }).eq("id", created.id);
      throw new Error(message);
    }
  });

export const launchStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => runStudy((context.supabase as any), context.userId, data.studyId));

export const regenerateStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ studyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await (context.supabase as any)
      .from("edm_studies")
      .update({ status: "researching", progress: 0, report: null, error: null, logs: [] })
      .eq("id", data.studyId);
    return runStudy((context.supabase as any), context.userId, data.studyId);
  });