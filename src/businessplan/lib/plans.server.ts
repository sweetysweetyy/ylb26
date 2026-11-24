import { resolveAppAiModel } from "@/lib/ai-models.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callGateway, parseJsonLoose, toBase64 } from "./ai.server";
import { SYSTEM_PROMPT, buildUserContent, normalizeContent, auditQuality, OUTPUT_CONTRACT } from "./analysis.server";
import type { PlanContent, Section } from "./plan-schema";

type AnyClient = SupabaseClient<any, any, any>;

async function resolveModel(supabase: AnyClient, userId: string): Promise<string> {
  return resolveAppAiModel(supabase, userId, "businessplan");
}

export async function runAnalysis(supabase: AnyClient, userId: string, planId: string) {
  const { data: plan, error } = await supabase
    .from("bp_plans")
    .select("id,source_path,source_filename,title")
    .eq("id", planId)
    .maybeSingle();

  if (error || !plan) throw new Error("Projet introuvable.");
  if (!plan.source_path) throw new Error("Aucun fichier PDF associé à ce projet.");

  await supabase
    .from("bp_plans")
    .update({ status: "processing", error_message: null })
    .eq("id", planId);

  try {
    const download = await supabase.storage.from("businessplan-files").download(plan.source_path as string);
    if (download.error || !download.data) throw new Error("Impossible de lire le fichier PDF stocké.");

    const base64 = toBase64(await download.data.arrayBuffer());
    const model = await resolveModel(supabase, userId);

    const raw = await callGateway(model, [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserContent((plan.source_filename as string) || "business-plan.pdf", base64, "application/pdf"),
      },
    ]);

    const parsed = parseJsonLoose<PlanContent>(raw);
    const content = normalizeContent(parsed);
    if (!content.sections.length) throw new Error("Aucune information exploitable n'a pu être extraite du PDF.");
    const quality = auditQuality(content, parsed.quality);
    content.quality = quality;

    const { error: updateError } = await supabase
      .from("bp_plans")
      .update({
        status: "ready",
        content: content as unknown as Record<string, unknown>,
        quality: quality as unknown as Record<string, unknown>,
        title: content.title || plan.title,
        error_message: null,
      })
      .eq("id", planId);
    if (updateError) throw new Error(updateError.message);

    return { ok: true as const, score: quality.score, sections: content.sections.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analyse impossible.";
    await supabase.from("bp_plans").update({ status: "error", error_message: message }).eq("id", planId);
    throw new Error(message);
  }
}

export async function runRefine(
  supabase: AnyClient,
  userId: string,
  planId: string,
  sectionId: string,
  instruction: string,
) {
  const { data: plan } = await supabase.from("bp_plans").select("content").eq("id", planId).maybeSingle();
  const content = plan?.content as PlanContent | undefined;
  if (!content?.sections?.length) throw new Error("Ce projet n'a pas encore de contenu analysé.");

  const section = content.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error("Section introuvable.");

  const model = await resolveModel(supabase, userId);
  const raw = await callGateway(model, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Voici une section d'un business plan déjà extrait (JSON). Améliore uniquement cette section selon la demande.
Demande de l'utilisateur : "${instruction}".
INTERDICTION ABSOLUE de modifier, inventer ou extrapoler un chiffre. Tu peux réécrire les textes, réorganiser les blocs,
ajouter un graphique UNIQUEMENT à partir des chiffres déjà présents dans la section.
Réponds avec un objet JSON unique du même format que la section fournie (clés: id, title, summary, blocks).

${OUTPUT_CONTRACT}

Section actuelle :
${JSON.stringify(section)}`,
    },
  ]);

  const improved = parseJsonLoose<Section>(raw);
  const merged = normalizeContent({ ...content, sections: content.sections.map((s) => (s.id === sectionId ? { ...improved, id: sectionId } : s)) });
  const quality = auditQuality(merged, content.quality);
  merged.quality = quality;

  const { error } = await supabase
    .from("bp_plans")
    .update({ content: merged as unknown as Record<string, unknown>, quality: quality as unknown as Record<string, unknown> })
    .eq("id", planId);
  if (error) throw new Error(error.message);

  return { ok: true as const };
}
