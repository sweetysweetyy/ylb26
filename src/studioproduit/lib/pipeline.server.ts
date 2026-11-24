/**
 * Cœur métier partagé : analyse du produit, construction de la série, rendu.
 * Utilisé par les server functions du studio ET par le cron Google Drive.
 */
import type { SupabaseClient } from "@supabase/supabase-js";


import { resolveAppAiModel } from "@/lib/ai-models.server";

import { askSol, renderScene } from "./ai.server";

// sp_ tables are not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, any, any>;

export type Analysis = {
  product_name: string;
  product_type: string;
  materials: string;
  color_palette: string;
  target_audience: string;
  positioning: string;
  key_selling_points: string[];
  trend_ideas: { title: string; description: string }[];
  recommended_styles: string[];
};

export type Settings = {
  style: string;
  mood: string;
  background: string;
  lighting: string;
  palette: string;
  format: "square" | "portrait" | "landscape";
  usage: string;
  props: string;
  notes: string;
};

export const DEFAULT_SETTINGS: Settings = {
  style: "Éditorial premium",
  mood: "Chaleureux",
  background: "Fond studio uni",
  lighting: "Lumière naturelle douce",
  palette: "Neutres sable",
  format: "square",
  usage: "Fiche produit e-commerce",
  props: "",
  notes: "",
};

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "product_name",
    "product_type",
    "materials",
    "color_palette",
    "target_audience",
    "positioning",
    "key_selling_points",
    "trend_ideas",
    "recommended_styles",
  ],
  properties: {
    product_name: { type: "string" },
    product_type: { type: "string" },
    materials: { type: "string" },
    color_palette: { type: "string" },
    target_audience: { type: "string" },
    positioning: { type: "string" },
    key_selling_points: { type: "array", items: { type: "string" } },
    trend_ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: { title: { type: "string" }, description: { type: "string" } },
      },
    },
    recommended_styles: { type: "array", items: { type: "string" } },
  },
};

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["concept", "shots"],
  properties: {
    concept: { type: "string" },
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["position", "title", "intent", "prompt"],
        properties: {
          position: { type: "integer" },
          title: { type: "string" },
          intent: { type: "string" },
          prompt: { type: "string" },
        },
      },
    },
  },
};

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function analyzeCore(db: Db, shootId: string): Promise<Analysis> {
  const { data: shoot, error } = await db
    .from("sp_shoots")
    .select("id, user_id, source_path")
    .eq("id", shootId)
    .single();
  if (error || !shoot) throw new Error("Séance introuvable.");

  const file = await db.storage.from("studioproduit-photos").download(shoot.source_path);
  if (file.error || !file.data) throw new Error("Image du produit introuvable.");
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  const mime = file.data.type || "image/png";

  const analysis = await askSol<Analysis>({
    instructions:
      "Tu es directeur artistique et expert en packshot e-commerce. Tu analyses une photo de produit " +
      "pour identifier précisément le produit, son positionnement, et proposer des angles de mise en scène " +
      "tendance en 2026 (styles, décors, matières, ambiances) qui feraient vendre ce produit. " +
      "Réponds toujours en français, de façon concrète et spécifique au produit visible.",
    content: [
      {
        type: "input_text",
        text:
          "Analyse ce produit. Donne 4 à 6 arguments de vente, 5 idées de mise en scène tendance " +
          "et 4 styles visuels recommandés.",
      },
      { type: "input_image", image_url: `data:${mime};base64,${toBase64(bytes)}` },
    ],
    schemaName: "product_analysis",
    model: await resolveAppAiModel(db, shoot.user_id, "studioproduit"),
    schema: ANALYSIS_SCHEMA,
    effort: "medium",
  });

  await db
    .from("sp_shoots")
    .update({
      analysis: analysis as unknown as never,
      product_name: analysis.product_name || "Produit",
      status: "analyzed",
    })
    .eq("id", shoot.id);

  return analysis;
}

export async function planCore(
  db: Db,
  shootId: string,
  userId: string,
  settings: Settings,
): Promise<{ concept: string; shots: { id: string; position: number }[] }> {
  const { data: shoot, error } = await db
    .from("sp_shoots")
    .select("id, product_name, analysis")
    .eq("id", shootId)
    .single();
  if (error || !shoot) throw new Error("Séance introuvable.");

  const plan = await askSol<{
    concept: string;
    shots: { position: number; title: string; intent: string; prompt: string }[];
  }>({
    instructions:
      "Tu es directeur artistique photo. Tu construis une série cohérente de 5 photos produit " +
      "destinées à une fiche e-commerce et aux réseaux sociaux. La série suit une structure logique : " +
      "1) packshot héros, 2) macro détail / matière, 3) mise en situation d'usage, 4) contexte lifestyle " +
      "avec échelle et accessoires, 5) composition éditoriale / flat-lay pour les réseaux. " +
      "Pour chaque photo tu écris un prompt de rendu en ANGLAIS, très précis : cadrage, focale, angle, " +
      "lumière, ombres, arrière-plan, matières, accessoires, palette, ambiance. " +
      "Chaque prompt DOIT commencer par une instruction de préservation absolue du produit fourni " +
      "(forme, couleurs, logo, texte, proportions identiques — ne rien inventer sur le produit). " +
      "Aucun texte ajouté dans l'image. Les titres et intentions sont en français.",
    content: [
      {
        type: "input_text",
        text: JSON.stringify({
          produit: shoot.product_name,
          analyse: shoot.analysis,
          parametres: settings,
        }),
      },
    ],
    schemaName: "shoot_plan",
    model: await resolveAppAiModel(db, userId, "studioproduit"),
    schema: PLAN_SCHEMA,
    effort: "medium",
  });

  const shots = plan.shots.slice(0, 5).map((shot, i) => ({
    shoot_id: shoot.id,
    user_id: userId,
    position: i + 1,
    title: shot.title,
    intent: shot.intent,
    prompt: shot.prompt,
    status: "pending",
  }));

  await db.from("sp_shots").delete().eq("shoot_id", shoot.id);
  const inserted = await db.from("sp_shots").insert(shots).select("id, position");
  if (inserted.error) throw new Error(inserted.error.message);

  await db
    .from("sp_shoots")
    .update({ settings: settings as unknown as never, status: "planned" })
    .eq("id", shoot.id);

  return { concept: plan.concept, shots: inserted.data ?? [] };
}

export async function renderCore(db: Db, userId: string, shotId: string): Promise<{ path: string }> {
  const { data: shot, error } = await db
    .from("sp_shots")
    .select("id, shoot_id, position, prompt")
    .eq("id", shotId)
    .single();
  if (error || !shot) throw new Error("Photo introuvable.");

  await db.from("sp_shots").update({ status: "rendering", error: null }).eq("id", shot.id);

  try {
    const { data: shoot } = await db
      .from("sp_shoots")
      .select("source_path, settings")
      .eq("id", shot.shoot_id)
      .single();
    if (!shoot) throw new Error("Séance introuvable.");

    const file = await db.storage.from("studioproduit-photos").download(shoot.source_path);
    if (file.error || !file.data) throw new Error("Image du produit introuvable.");
    const bytes = new Uint8Array(await file.data.arrayBuffer());

    const format = (shoot.settings as { format?: string } | null)?.format ?? "square";
    const size =
      format === "portrait" ? "1024x1536" : format === "landscape" ? "1536x1024" : "1024x1024";

    const out = await renderScene({
      prompt: shot.prompt,
      image: bytes,
      mimeType: file.data.type || "image/png",
      size: size as "1024x1024" | "1024x1536" | "1536x1024",
    });

    const path = `${userId}/${shot.shoot_id}/shot-${shot.position}-${Date.now()}.png`;
    const up = await db.storage
      .from("studioproduit-photos")
      .upload(path, out as unknown as ArrayBufferView, {
        contentType: "image/png",
        upsert: true,
      });
    if (up.error) throw new Error(up.error.message);

    await db
      .from("sp_shots")
      .update({ image_path: path, status: "done", error: null })
      .eq("id", shot.id);

    return { path };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de la génération.";
    await db.from("sp_shots").update({ status: "failed", error: message }).eq("id", shot.id);
    throw new Error(message);
  }
}
