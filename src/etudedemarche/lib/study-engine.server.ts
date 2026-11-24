/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { callAi, parseJsonResponse, type ChatMessage } from "./ai-gateway.server";
import type { StudyAnalysis, StudyLog, StudyReport } from "./study-types";

type Client = SupabaseClient<any, any, any>;

const DEPTH_BRIEF: Record<string, string> = {
  express: "Étude condensée : va droit au but, 6 sections maximum, chaque section 150-250 mots.",
  standard: "Étude complète et professionnelle : 8 sections, chaque section 250-400 mots.",
  approfondi:
    "Dossier exhaustif de niveau bancaire/administratif : 10 à 12 sections, chaque section 400-600 mots, argumentation chiffrée systématique.",
};

async function loadContext(supabase: Client, userId: string) {
  const [{ data: settings }, { data: methodologies }] = await Promise.all([
    supabase.from("edm_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("edm_methodologies")
      .select("title, content, category, priority")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
  ]);

  const rules = (methodologies ?? [])
    .map(
      (m, i) =>
        `${i + 1}. [${m.category} · priorité ${m.priority}] ${m.title}\n${m.content}`,
    )
    .join("\n\n");

  return {
    model: await (await import("@/lib/ai-models.server")).resolveAppAiModel(supabase, userId, "etudedemarche"),
    depth: settings?.depth ?? "standard",
    language: settings?.language ?? "fr",
    rules,
  };
}

function systemPrompt(rules: string, language: string) {
  return [
    "Tu es un directeur d'études de marché senior (15 ans d'expérience, cabinet international).",
    "Tu produis des études de marché rigoureuses, chiffrées, exploitables auprès d'organismes officiels (banques, BPI, chambres de commerce, investisseurs).",
    "Règles absolues : jamais d'invention de chiffre sans le qualifier (estimation, ordre de grandeur, fourchette) ; toujours indiquer l'origine et la fiabilité des données ; toujours raisonner par segments, par zone géographique et par horizon de temps.",
    `Langue de rédaction : ${language === "fr" ? "français professionnel" : language}.`,
    rules
      ? `MÉTHODOLOGIES, CONSEILS ET ASTUCES IMPOSÉS PAR LE CLIENT — tu dois les suivre fidèlement, ils priment sur tes habitudes :\n${rules}`
      : "Le client n'a fourni aucune méthodologie spécifique : applique les standards du métier (AFNOR/ESOMAR, PESTEL, Porter, SWOT, TAM/SAM/SOM).",
  ].join("\n\n");
}

export async function analyzeBrief(
  supabase: Client,
  userId: string,
  brief: string,
  modelOverride?: string,
): Promise<{ analysis: StudyAnalysis; model: string }> {
  const ctx = await loadContext(supabase, userId);
  const model = modelOverride ?? ctx.model;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(ctx.rules, ctx.language) },
    {
      role: "user",
      content: `Analyse la demande d'étude de marché suivante et cadre le projet.\n\nDEMANDE BRUTE :\n"""${brief}"""\n\nRéponds UNIQUEMENT par un objet JSON valide, sans texte autour, au format exact :\n{
  "titre_suggere": string,
  "reformulation": string,
  "secteur": string,
  "zone_geographique": string,
  "cible": string,
  "objectifs": string[],
  "hypotheses": string[],
  "questions_cles": string[],
  "plan_de_recherche": [{"etape": string, "objectif": string, "sources": string[]}],
  "risques": string[]
}`,
    },
  ];

  const raw = await callAi(model, messages, { temperature: 0.3 });
  const analysis = parseJsonResponse<StudyAnalysis>(raw);
  return { analysis, model };
}

async function pushLog(
  supabase: Client,
  studyId: string,
  logs: StudyLog[],
  label: string,
  progress: number,
  extra: Record<string, unknown> = {},
) {
  logs.push({ at: new Date().toISOString(), label });
  await supabase
    .from("edm_studies")
    .update({ logs: logs as unknown as never, progress, ...extra })
    .eq("id", studyId);
}

export async function runStudy(supabase: Client, userId: string, studyId: string) {
  const { data: study, error } = await supabase
    .from("edm_studies")
    .select("*")
    .eq("id", studyId)
    .maybeSingle();
  if (error || !study) throw new Error("Étude introuvable.");

  const ctx = await loadContext(supabase, userId);
  const model = study.model || ctx.model;
  const logs: StudyLog[] = Array.isArray(study.logs) ? (study.logs as unknown as StudyLog[]) : [];
  const system = systemPrompt(ctx.rules, ctx.language);

  try {
    // 1. Cadrage
    let analysis = study.analysis as StudyAnalysis | null;
    await pushLog(supabase, studyId, logs, "Cadrage de la demande", 10, { status: "researching" });
    if (!analysis) {
      analysis = (await analyzeBrief(supabase, userId, study.brief, model)).analysis;
      await supabase
        .from("edm_studies")
        .update({ analysis: analysis as unknown as never, title: analysis.titre_suggere || study.title })
        .eq("id", studyId);
    }

    // 2. Collecte & structuration des faits marché
    await pushLog(supabase, studyId, logs, "Collecte et recoupement des données marché", 30);
    const research = await callAi(
      model,
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Constitue le dossier de travail factuel de l'étude ci-dessous.\n\nCADRAGE :\n${JSON.stringify(analysis)}\n\nDEMANDE INITIALE :\n"""${study.brief}"""\n\nProduis des notes de recherche denses en markdown : dimensionnement du marché (TAM/SAM/SOM avec méthode de calcul explicite), dynamique et croissance, réglementation applicable, structure concurrentielle (acteurs nommés), segments de clientèle et comportements d'achat, structure de coûts et de prix pratiqués, canaux de distribution, tendances et signaux faibles, sources utilisables (organismes officiels, INSEE, études sectorielles, fédérations professionnelles) avec niveau de fiabilité.\nChaque donnée chiffrée doit être qualifiée (source, année, méthode d'estimation). Pas de remplissage.`,
        },
      ],
      { temperature: 0.4 },
    );

    // 3. Analyse stratégique
    await pushLog(supabase, studyId, logs, "Analyse stratégique et modélisation", 60);
    const strategy = await callAi(
      model,
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `À partir du dossier factuel suivant, réalise l'analyse stratégique : PESTEL, 5 forces de Porter, SWOT argumenté, segmentation prioritaire avec poids estimés, positionnement recommandé, stratégie tarifaire, scénarios (pessimiste / réaliste / optimiste) chiffrés, risques et mitigations, plan d'action 0-3 / 3-12 / 12-36 mois avec indicateurs.\n\nDOSSIER FACTUEL :\n${research}`,
        },
      ],
      { temperature: 0.4 },
    );

    // 4. Rédaction finale structurée
    await pushLog(supabase, studyId, logs, "Rédaction du rapport final", 85);
    const raw = await callAi(
      model,
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Rédige le RAPPORT FINAL de l'étude de marché, prêt à être déposé auprès d'un organisme officiel.\n${DEPTH_BRIEF[ctx.depth] ?? DEPTH_BRIEF["standard"]}\n\nCADRAGE :\n${JSON.stringify(analysis)}\n\nDOSSIER FACTUEL :\n${research}\n\nANALYSE STRATÉGIQUE :\n${strategy}\n\nRéponds UNIQUEMENT par un objet JSON valide, sans texte autour, au format exact :\n{
  "titre": string,
  "sous_titre": string,
  "resume_executif": string,
  "sections": [{"titre": string, "contenu": string, "points_cles": string[]}],
  "taille_marche": [{"indicateur": string, "valeur": string, "commentaire": string}],
  "concurrents": [{"nom": string, "positionnement": string, "forces": string, "faiblesses": string}],
  "segments": [{"nom": string, "description": string, "poids_estime": string}],
  "swot": {"forces": string[], "faiblesses": string[], "opportunites": string[], "menaces": string[]},
  "prix": [{"modele": string, "fourchette": string, "justification": string}],
  "recommandations": string[],
  "plan_action": [{"horizon": string, "action": string, "indicateur": string}],
  "risques": [{"risque": string, "impact": string, "mitigation": string}],
  "sources": [{"titre": string, "origine": string, "fiabilite": string}],
  "methodologie": string,
  "limites": string
}\nLe champ "contenu" de chaque section est du texte rédigé (paragraphes séparés par \\n\\n), sans markdown.`,
        },
      ],
      { temperature: 0.3 },
    );

    const report = parseJsonResponse<StudyReport>(raw);
    logs.push({ at: new Date().toISOString(), label: "Étude terminée" });
    await supabase
      .from("edm_studies")
      .update({
        report: report as unknown as never,
        status: "completed",
        progress: 100,
        title: report.titre || study.title,
        logs: logs as unknown as never,
        error: null,
      })
      .eq("id", studyId);

    return { ok: true as const, report };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue pendant l'étude.";
    logs.push({ at: new Date().toISOString(), label: "Échec", detail: message });
    await supabase
      .from("edm_studies")
      .update({ status: "failed", error: message, logs: logs as unknown as never })
      .eq("id", studyId);
    throw new Error(message);
  }
}