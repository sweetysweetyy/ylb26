import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DocumentInput = z.object({
  kind: z.enum(["cv", "cover_letter"]),
  filename: z.string().min(1),
  base64: z.string().min(10),
  mime: z.string().default("application/pdf"),
});

export const analyzeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DocumentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { extractPdfText, isProbablyPdf } = await import("@/nexusjob/lib/pdf.server");
    const { callAIJson, transcribeDocument } = await import("@/nexusjob/lib/ai.server");
    const { CV_EXTRACTION_SYSTEM, cvExtractionPrompt } = await import("@/nexusjob/lib/prompts.server");
    const { mergeProfile, computeCompletion, profileToPromptText, loadContext } = await import(
      "@/nexusjob/lib/profile.server"
    );

    const { supabase, userId } = context;
    const { profile, settings } = await loadContext(supabase, userId);
    // Modèle réellement choisi par l'utilisateur pour l'extraction / retranscription.
    const model =
      (settings.ai_extraction_model as string) ||
      (settings.ai_model as string) ||
      "google/gemini-3.5-flash";

    const enough = (t: string) => t.replace(/\s/g, "").length >= 80;
    const dataUrl = data.base64.startsWith("data:")
      ? data.base64
      : `data:${data.mime || "application/pdf"};base64,${data.base64}`;

    let text = "";
    let method = "texte";

    if (isProbablyPdf(data.base64, data.filename, data.mime)) {
      text = await extractPdfText(data.base64);
    } else {
      try {
        text = new TextDecoder().decode(
          Uint8Array.from(atob(data.base64.split(",").pop() ?? ""), (c) => c.charCodeAt(0)),
        );
      } catch {
        text = "";
      }
    }

    // Repli : retranscription multimodale par le modèle choisi (PDF scanné, mise en page exotique…)
    if (!enough(text)) {
      try {
        const transcribed = await transcribeDocument(model, dataUrl, data.filename);
        if (enough(transcribed)) {
          text = transcribed;
          method = "retranscription IA";
        }
      } catch {
        /* on remonte l'erreur générique ci-dessous */
      }
    }

    if (!enough(text)) {
      throw new Error(
        "Impossible de lire ce document. Essayez un autre export PDF (ou une image nette du document).",
      );
    }


    const extracted = await callAIJson<Record<string, unknown>>(model, [
      { role: "system", content: CV_EXTRACTION_SYSTEM },
      {
        role: "user",
        content: cvExtractionPrompt(data.kind, text, profileToPromptText(profile)),
      },
    ]);

    const merged = mergeProfile(profile, extracted);
    merged.completion = computeCompletion({ ...profile, ...merged });
    if (data.kind === "cv") {
      merged.cv_text = text.slice(0, 60000);
      merged.cv_filename = data.filename;
    } else {
      merged.cover_letter_text = text.slice(0, 30000);
      merged.cover_letter_filename = data.filename;
    }

    const { data: saved, error } = await supabase
      .from("nxj_profiles")
      .upsert({ user_id: userId, ...merged } as never, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw new Error(`Enregistrement du profil impossible : ${error.message}`);

    return {
      profile: saved,
      characters: text.length,
      model,
      method,
    };


  });

export const enrichProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { callAIJson } = await import("@/nexusjob/lib/ai.server");
    const { loadContext, profileToPromptText, computeCompletion } = await import(
      "@/nexusjob/lib/profile.server"
    );
    const { supabase, userId } = context;
    const { profile, settings } = await loadContext(supabase, userId);
    const model = (settings.ai_model as string) ?? "google/gemini-3.5-flash";

    const result = await callAIJson<{
      headline?: string;
      summary?: string;
      suggested_skills?: string[];
      improvements?: string[];
      target_roles?: string[];
    }>(model, [
      {
        role: "system",
        content:
          "Tu es un coach carrière francophone. Tu optimises un profil candidat pour maximiser son matching avec des offres. Réponds uniquement en JSON valide.",
      },
      {
        role: "user",
        content: `Profil actuel :\n${profileToPromptText(profile)}\n\nRenvoie {"headline":"titre optimisé","summary":"résumé optimisé 4 phrases","suggested_skills":["compétences implicites à ajouter"],"improvements":["conseils concrets"],"target_roles":["postes cibles pertinents"]}`,
      },
    ]);

    const patch: Record<string, unknown> = {};
    if (result.headline) patch.headline = result.headline;
    if (result.summary) patch.summary = result.summary;
    patch.completion = computeCompletion({ ...profile, ...patch });

    await supabase.from("nxj_profiles").update(patch as never).eq("user_id", userId);

    return {
      suggestedSkills: result.suggested_skills ?? [],
      improvements: result.improvements ?? [],
      targetRoles: result.target_roles ?? [],
    };
  });
