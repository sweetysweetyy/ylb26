import type { Ctx } from "@/lib/assistant-apps.server";
type WorkflowContext = { supabase: Ctx["db"]; userId: string };
import { z } from "zod";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { analyze, mockup, extractJson, extractSection } from "./ai.server";

const designSchema = z.object({
  palette: z.record(z.string(), z.string()).optional(),
  fonts: z.object({ heading: z.string(), body: z.string() }).partial().optional(),
  tone: z.string().optional(),
  style: z.string().optional(),
}).passthrough();

export type Design = {
  palette?: Record<string, string>;
  fonts?: { heading?: string; body?: string };
  tone?: string;
  style?: string;
};

export type SuggestedSection = { title: string; description: string };

/** 1. Analyse du brief global (GPT-5.6 Luna). */
export async function analyzeBriefCore({ data, context }: { data: { brief: string }; context: WorkflowContext }) {
    const model = await resolveAppAiModel(context.supabase, context.userId, "pageweaver");
    const sys = `Tu es directeur artistique web senior. À partir de la description d'une page web, tu définis une direction artistique cohérente et la liste des sections idéales, dans l'ordre logique de la page.
Réponds UNIQUEMENT en JSON:
{"name":"nom court du projet","design":{"palette":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex","muted":"#hex"},"fonts":{"heading":"nom Google Font","body":"nom Google Font"},"tone":"ton éditorial en une phrase","style":"style visuel en une phrase"},"sections":[{"title":"...","description":"description détaillée du contenu et de la mise en page (3-5 phrases)"}]}
Entre 4 et 8 sections. Textes en français.`;
    const out = await analyze(model, sys, data.brief);
    const j = extractJson<{ name?: string; design: Design; sections: SuggestedSection[] }>(out);
    return { name: j.name ?? "", design: designSchema.parse(j.design ?? {}) as Design, sections: (j.sections ?? []).slice(0, 10) };
}


const SECTION_RULES = `Règles de sortie STRICTES:
- Renvoie UNIQUEMENT un élément <section>...</section> HTML, sans markdown, sans <html>, <head> ni <body>.
- Utilise exclusivement des classes Tailwind CSS (CDN déjà chargé). Couleurs de marque disponibles: bg-brand-primary, text-brand-primary, brand-secondary, brand-accent, brand-bg, brand-surface, brand-text, brand-muted (utilisables avec bg-, text-, border-, from-, to-). Polices: font-heading et font-body.
- Mise en page desktop 1280px ET responsive mobile (préfixes sm: md: lg:).
- Animations: ajoute l'attribut data-anim sur les éléments ("fade-up","fade-in","zoom-in","slide-left","slide-right","blur-in") et data-delay="100..800" pour échelonner. Classes "hover-lift" et "hover-glow" disponibles pour les effets de survol. Classe "float" pour un flottement continu, "marquee" pour un défilement horizontal infini (sur un conteneur flex).
- Images: https://picsum.photos/seed/<motclé>/<largeur>/<hauteur>. Icônes: SVG inline simples.
- Contenu réaliste en français, jamais de lorem ipsum. Pas de <script>.
- Qualité premium, hiérarchie typographique forte, espacements généreux.`;

const sectionInput = z.object({
  brief: z.string().max(6000),
  design: z.any(),
  title: z.string().max(200),
  description: z.string().max(6000),
  config: z.record(z.string(), z.any()),
  neighbors: z.array(z.string()).max(20).optional(),
});

function describeConfig(c: any) {
  const lines: string[] = [];
  if (c.layout) lines.push(`Disposition: ${c.layout}`);
  if (c.background) lines.push(`Arrière-plan: ${c.background}`);
  if (c.height) lines.push(`Hauteur: ${c.height}`);
  if (c.animation && c.animation !== "aucune") lines.push(`Animation d'entrée: ${c.animation}`);
  if (c.stagger) lines.push(`Apparition échelonnée des éléments`);
  if (c.hover) lines.push(`Effets de survol sur les cartes et boutons`);
  if (c.float) lines.push(`Éléments décoratifs flottants`);
  if (c.marquee) lines.push(`Bandeau défilant (marquee)`);
  if (c.extra) lines.push(`Autres consignes: ${c.extra}`);
  return lines.join("\n");
}

/** 2. Génération d'une section : Luna comprend la demande, le modèle économique produit le HTML. */
export async function generateSectionCore({ data, context }: { data: z.infer<typeof sectionInput>; context: WorkflowContext }) {
    const model = await resolveAppAiModel(context.supabase, context.userId, "pageweaver");
    const spec = await analyze(model, 
      `Tu es UX designer. Transforme la demande de l'utilisateur en spécification précise et concise (max 180 mots) d'une section web: objectif, structure (colonnes, blocs), contenus exacts (titres, textes, boutons), visuels, animations. Respecte la direction artistique. Réponds en texte brut.`,
      `Page: ${data.brief}\nDirection artistique: ${JSON.stringify(data.design)}\nAutres sections de la page: ${(data.neighbors ?? []).join(", ")}\n\nSection "${data.title}":\n${data.description}\n\nConfiguration:\n${describeConfig(data.config)}`,
    );
    const html = await mockup(
      `Tu es intégrateur front-end expert. Tu codes une section de page web d'après une spécification.\n${SECTION_RULES}`,
      `Direction artistique: ${JSON.stringify(data.design)}\n\nSpécification:\n${spec}\n\nConfiguration:\n${describeConfig(data.config)}`,
    );
    return { html: extractSection(html) };
}


const regenInput = z.object({
  design: z.any(),
  title: z.string().max(200),
  html: z.string().max(60000),
  request: z.string().max(4000),
  annotations: z
    .array(z.object({ kind: z.string(), note: z.string().max(1000), position: z.string(), target: z.string().max(600) }))
    .max(40),
});

/** 3. Régénération en tenant compte des annotations, dessins et demandes. */
export async function regenerateSectionCore({ data, context }: { data: z.infer<typeof regenInput>; context: WorkflowContext }) {
    const model = await resolveAppAiModel(context.supabase, context.userId, "pageweaver");
    const notes = data.annotations
      .map((a, i) => `${i + 1}. [${a.kind} à ${a.position}] "${a.note || "(zone dessinée sans texte)"}" — élément ciblé: ${a.target}`)
      .join("\n");
    const changes = await analyze(model, 
      `Tu analyses les retours d'un utilisateur sur une maquette de section web (annotations positionnées, zones dessinées, demande globale). Produis une liste numérotée de modifications précises et actionnables pour un intégrateur, en citant l'élément concerné. Une zone entourée sans texte signifie "à retravailler/mettre en valeur" selon le contexte. Réponds en texte brut, max 200 mots.`,
      `Section "${data.title}"\nDemande globale: ${data.request || "(aucune)"}\nAnnotations:\n${notes || "(aucune)"}`,
    );
    const html = await mockup(
      `Tu es intégrateur front-end expert. Tu modifies une section HTML existante en appliquant EXACTEMENT la liste de modifications, en conservant tout le reste.\n${SECTION_RULES}`,
      `Direction artistique: ${JSON.stringify(data.design)}\n\nModifications à appliquer:\n${changes}\n\nHTML actuel:\n${data.html}`,
    );
    return { html: extractSection(html), changes };
}

