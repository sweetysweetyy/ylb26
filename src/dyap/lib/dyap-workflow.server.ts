import type { Ctx } from "@/lib/assistant-apps.server";
type WorkflowContext = { supabase: Ctx["db"]; userId: string };
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { dy } from "@/dyap/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Msg = { role: "system" | "user" | "assistant"; content: string };

async function chat(model: string, messages: Msg[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (res.status === 429) throw new Error("Limite de requêtes atteinte, réessayez dans quelques instants.");
  if (res.status === 402) throw new Error("Crédits IA insuffisants.");
  if (!res.ok) { console.error("Dyap AI error", res.status, await res.text()); throw new Error("Erreur du service IA"); }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

function parseJson(raw: string) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(m ? m[1].trim() : raw.trim());
}

type AnalyzeInput = { csvData: string; fileName: string; analysisLevel?: string; tone?: string; language?: string };

export async function dyapAnalyzeCore({ data, context }: { data: AnalyzeInput; context: WorkflowContext }) {
    const { csvData, fileName, analysisLevel, tone, language } = data;
    const toneMap: Record<string, string> = {
      corporate: "professionnel et corporate, avec un ton formel",
      analyste: "analytique et technique, orienté données",
      startup: "dynamique et moderne, orienté startup",
    };

    const levelMap: Record<string, string> = {
      standard: "Fais une analyse standard avec les principaux KPIs.",
      advanced: "Fais une analyse avancée avec corrélations, tendances et segmentation.",
      expert: "Fais une analyse experte complète : corrélations, anomalies, tendances, segmentation, distributions, recommandations stratégiques détaillées.",
    };

    const systemPrompt = `Tu es un expert en analyse de données et création de présentations professionnelles. 
Tu dois analyser les données CSV fournies et générer une structure de diaporama complète.

Ton : ${toneMap[tone ?? ""] || toneMap.corporate}
Niveau : ${levelMap[analysisLevel ?? ""] || levelMap.standard}
Langue : ${language || "fr"}

IMPORTANT: Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte autour. Le JSON doit suivre cette structure exacte:

{
  "title": "Titre de la présentation",
  "description": "Description courte",
  "slides": [
    {
      "type": "cover",
      "title": "Titre principal",
      "subtitle": "Sous-titre"
    },
    {
      "type": "summary",
      "title": "Résumé Exécutif",
      "content": "Texte du résumé",
      "keyPoints": ["point 1", "point 2", "point 3"]
    },
    {
      "type": "chart",
      "title": "Titre du graphique",
      "chartType": "bar|line|pie|radar|scatter|area",
      "interpretation": "Analyse détaillée et interprétation stratégique du graphique",
      "impact": "Impact business",
      "recommendation": "Recommandation stratégique",
      "data": [{"name": "Cat1", "value": 100}, {"name": "Cat2", "value": 200}],
      "dataKeys": ["value"],
      "xKey": "name"
    },
    {
      "type": "kpi",
      "title": "KPIs Clés",
      "kpis": [{"label": "Nom KPI", "value": "123", "change": "+12%", "interpretation": "Explication"}]
    },
    {
      "type": "insights",
      "title": "Insights Stratégiques",
      "insights": [{"title": "Insight 1", "description": "Description détaillée", "impact": "high|medium|low"}]
    },
    {
      "type": "recommendations",
      "title": "Recommandations",
      "recommendations": [{"title": "Reco 1", "description": "Description", "priority": "high|medium|low"}]
    },
    {
      "type": "conclusion",
      "title": "Conclusion",
      "content": "Texte de conclusion",
      "nextSteps": ["étape 1", "étape 2"]
    }
  ]
}

Génère entre 8 et 15 slides avec des données réelles extraites du CSV. Pour les graphiques, utilise les vraies valeurs du dataset. Choisis les types de graphiques les plus pertinents. Chaque interprétation doit être factuelle, stratégique et exploitable.`;

    const model = await resolveAppAiModel(context.supabase, context.userId, "dyap");
    const raw = await chat(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Voici les données CSV à analyser:\n\n${csvData}` },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let slideData: any;
    try { slideData = parseJson(raw); } catch { throw new Error("L'IA n'a pas retourné un format valide. Réessayez."); }

    const { data: presentation, error } = await dy(context.supabase).from("dyap_presentations").insert({
      user_id: context.userId,
      title: slideData.title || `Présentation ${fileName}`,
      description: slideData.description || "",
      slide_data: slideData.slides || [],
      source_file_name: fileName,
      status: "completed",
    }).select().single();
    if (error) { console.error("Dyap DB error", error); throw new Error("Erreur de sauvegarde"); }
    return { presentation, slideData };
}


type UpdateInput = { presentationId: string; message: string; conversationHistory?: Msg[] };

export async function dyapUpdateCore({ data, context }: { data: UpdateInput; context: WorkflowContext }) {
    const db = dy(context.supabase);
    const { data: p, error: fetchError } = await db.from("dyap_presentations").select("*").eq("id", data.presentationId).single();
    if (fetchError || !p) throw new Error("Présentation non trouvée");

    const systemPrompt = `Tu es un assistant expert en modification de présentations professionnelles.
Tu as accès à la structure JSON d'une présentation existante. L'utilisateur te demande de la modifier.

Présentation actuelle (JSON):
${JSON.stringify(p.slide_data, null, 2)}

Titre: ${p.title}

INSTRUCTIONS:
- Quand l'utilisateur demande une modification, applique-la à la structure JSON
- Retourne TOUJOURS ta réponse dans ce format exact:

Si tu modifies la présentation:
{"action": "update", "message": "Description de ce que tu as fait", "slides": [... slides modifiées ...]}

Si tu réponds à une question sans modifier:
{"action": "reply", "message": "Ta réponse"}

Pour les slides, utilise les mêmes types que l'original: cover, summary, chart, kpi, insights, recommendations, conclusion.
Pour les charts, les types valides sont: bar, line, pie, radar, scatter, area.
Assure-toi que les données des graphiques sont cohérentes avec le contexte de la présentation.`;

    const history = (data.conversationHistory || []).filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: String(m.content) }));
    const model = await resolveAppAiModel(context.supabase, context.userId, "dyap");
    const raw = await chat(model, [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: data.message }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    try { result = parseJson(raw); } catch { result = { action: "reply", message: raw }; }

    if (result.action === "update" && result.slides) {
      const { error } = await db.from("dyap_presentations").update({ slide_data: result.slides, version: p.version + 1 }).eq("id", p.id).eq("user_id", context.userId);
      if (error) throw new Error("Erreur de sauvegarde");
    }
    return { action: result.action as string, message: result.message as string };
}

