import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SearchInput = z.object({
  sources: z.array(z.string()).optional(),
  queryOverride: z.string().optional(),
  limitPerSource: z.number().optional(),
  brief: z.string().optional(),
});

export const runJobSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { runSearchPipeline } = await import("@/nexusjob/lib/search.server");
    const result = await runSearchPipeline(context.supabase, context.userId, data);
    return {
      searchId: result.searchId ?? null,
      count: result.count,
      avgScore: result.avgScore,
      logs: result.logs,
      plan: result.plan,
      decisions: result.decisions,
    };
  });

const CoverLetterInput = z.object({ offerId: z.string().uuid() });

export const generateApplicationKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoverLetterInput.parse(input))
  .handler(async ({ data, context }) => {
    const { callAIJson } = await import("@/nexusjob/lib/ai.server");
    const { loadContext, profileToPromptText } = await import("@/nexusjob/lib/profile.server");
    const { supabase, userId } = context;

    const { data: offer, error } = await supabase
      .from("nxj_offers")
      .select("*")
      .eq("id", data.offerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !offer) throw new Error("Offre introuvable.");

    const { profile, settings } = await loadContext(supabase, userId);
    const model = (settings.ai_model as string) ?? "google/gemini-3.5-flash";
    const o = offer as Record<string, unknown>;

    const result = await callAIJson<{
      cover_letter?: string;
      email_subject?: string;
      email_body?: string;
      talking_points?: string[];
    }>(model, [
      {
        role: "system",
        content:
          "Tu es un expert en candidatures francophones. Tu rédiges des lettres percutantes, concrètes, sans clichés. Réponds uniquement en JSON valide.",
      },
      {
        role: "user",
        content: `PROFIL :\n${profileToPromptText(profile)}\n\nLETTRE DE MOTIVATION EXISTANTE (style de référence) :\n${String(profile.cover_letter_text ?? "").slice(0, 2500)}\n\nOFFRE :\nTitre: ${o.title}\nEntreprise: ${o.company}\nLieu: ${o.location}\nRésumé: ${o.summary}\nCompétences manquantes: ${JSON.stringify(o.missing_skills)}\nDescription: ${String(o.description ?? "").slice(0, 4000)}\n\nRenvoie {"cover_letter":"lettre complète prête à envoyer","email_subject":"","email_body":"email court d'accompagnement","talking_points":["arguments clés"]}`,
      },
    ]);

    return {
      coverLetter: result.cover_letter ?? "",
      emailSubject: result.email_subject ?? "",
      emailBody: result.email_body ?? "",
      talkingPoints: result.talking_points ?? [],
    };
  });
