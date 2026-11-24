import type { PlanContent, Quality, QualityIssue, Section, Block } from "./plan-schema";

export const SYSTEM_PROMPT = `Tu es un consultant senior en financement d'entreprise, analyste financier et directeur artistique éditorial.
Ta mission : analyser un Business Plan PDF fourni par l'utilisateur et le RECONSTRUIRE en une version professionnelle,
structurée et prête à être présentée à une banque, un investisseur ou un organisme de financement.

RÈGLE ABSOLUE DE FIDÉLITÉ :
- Tu n'inventes JAMAIS un chiffre, un montant, une date, un pourcentage ou un nom.
- Tous les nombres proviennent strictement du PDF. Si une donnée est absente, tu ne la remplaces pas : tu la signales dans "quality.missing".
- Tu peux reformuler, structurer, synthétiser, hiérarchiser et calculer des totaux/écarts UNIQUEMENT à partir des valeurs présentes.
- Chaque tableau et chaque graphique doit s'appuyer sur des données réellement présentes dans le document.

QUALITÉ ÉDITORIALE :
- Structure professionnelle standard : Résumé exécutif, Présentation du projet, Équipe, Marché et concurrence, Offre et modèle économique,
  Stratégie commerciale et marketing, Opérations, Prévisionnel financier (CA, charges, résultat, trésorerie), Investissements et financement,
  Analyse des risques, Conclusion. N'inclus que les sections alimentées par le document.
- Textes clairs, précis, ton professionnel français, phrases courtes, sans remplissage marketing.
- Reconstruis TOUS les tableaux du PDF en tableaux structurés (colonnes + lignes), avec unités cohérentes.
- Ajoute des graphiques pertinents (évolution du CA, répartition des charges, résultat, trésorerie, plan de financement, investissements)
  en choisissant le type le plus adapté : line/area pour l'évolution, bar/stackedBar pour les comparaisons, pie pour les répartitions.
- Ajoute des indicateurs clés (kpis) et des encadrés (callout) uniquement lorsqu'ils apportent une vraie valeur.

Tu réponds STRICTEMENT en JSON valide, sans texte autour, au format demandé.`;

export const OUTPUT_CONTRACT = `Format JSON attendu :
{
  "title": string,
  "subtitle": string,
  "company": string,
  "author": string,
  "date": string,
  "currency": string,           // ex "EUR"
  "executiveSummary": string,   // 5 à 10 phrases
  "highlights": [{"label": string, "value": string, "note": string}],   // 3 à 6 indicateurs clés issus du PDF
  "sections": [
    {
      "id": string,              // slug: "marche", "previsionnel-financier"...
      "title": string,
      "summary": string,         // 1 à 2 phrases d'accroche
      "blocks": [
        {"type":"paragraph","text": string},
        {"type":"bullets","items": [string]},
        {"type":"kpis","items":[{"label":string,"value":string,"note":string}]},
        {"type":"callout","tone":"info|warning|success","title":string,"text":string},
        {"type":"table","title":string,"columns":[string],"rows":[[string|number]],"unit":string,"note":string,"totalRowIndexes":[number],"numericFrom":1},
        {"type":"chart","chart":"line|bar|area|pie|stackedBar","title":string,"xKey":string,
         "series":[{"key":string,"label":string}],"data":[{"<xKey>":string,"<serieKey>":number}],"unit":string,"insight":string}
      ]
    }
  ],
  "quality": {
    "score": number,             // 0-100, honnête
    "issues": [{"severity":"info|warning|critical","area":"donnees|mise_en_page|coherence|completude","message":string}],
    "strengths": [string],
    "missing": [string]          // informations manquantes pour un dossier de financement complet
  }
}
Contraintes : les valeurs de "data" des graphiques sont des nombres bruts (pas de symboles ni d'espaces).
Les cellules de tableau numériques sont des nombres bruts quand c'est possible. 8 à 14 sections maximum.`;

export function buildUserContent(filename: string, base64: string, mime: string) {
  return [
    {
      type: "text",
      text: `Analyse ce Business Plan (${filename}) et reconstruis-le intégralement.\n\n${OUTPUT_CONTRACT}`,
    },
    {
      type: "file",
      file: { filename, file_data: `data:${mime};base64,${base64}` },
    },
  ];
}

/* ---------------- Normalisation & contrôle qualité automatique ---------------- */

const num = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function slug(input: string, index: number) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `section-${index + 1}`;
}

export function normalizeContent(raw: PlanContent): PlanContent {
  const sections: Section[] = (raw.sections ?? [])
    .filter((s) => s && (s.title || (s.blocks ?? []).length))
    .map((s, i) => {
      const section: Section = {
        id: slug(s.id || s.title || "", i),
        title: s.title?.trim() || `Section ${i + 1}`,
        blocks: (s.blocks ?? []).filter(Boolean).map(normalizeBlock).filter(Boolean) as Block[],
      };
      const summary = s.summary?.trim();
      if (summary) section.summary = summary;
      return section;
    });

  return {
    ...raw,
    title: raw.title?.trim() || "Business Plan",
    currency: raw.currency || "EUR",
    sections,
  };
}

function normalizeBlock(block: Block): Block | null {
  if (block.type === "table") {
    const columns = (block.columns ?? []).map((c) => String(c));
    const rows = (block.rows ?? []).filter((r) => Array.isArray(r) && r.length).map((r) => r.slice(0, columns.length));
    if (!columns.length || !rows.length) return null;
    return { ...block, columns, rows };
  }
  if (block.type === "chart") {
    const data = (block.data ?? []).filter((d) => d && typeof d === "object");
    const series = (block.series ?? []).filter((s) => s?.key);
    if (!data.length || !series.length) return null;
    const cleanData = data.map((row) => {
      const out: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === block.xKey) out[k] = String(v);
        else {
          const n = num(v);
          if (n !== null) out[k] = n;
        }
      }
      return out;
    });
    return { ...block, series, data: cleanData };
  }
  if (block.type === "bullets") {
    const items = (block.items ?? []).map(String).filter((t) => t.trim());
    return items.length ? { ...block, items } : null;
  }
  if (block.type === "kpis") {
    const items = (block.items ?? []).filter((i) => i?.label);
    return items.length ? { ...block, items } : null;
  }
  if (block.type === "paragraph") {
    return block.text?.trim() ? block : null;
  }
  return block;
}

export function auditQuality(content: PlanContent, aiQuality?: Quality): Quality {
  const issues: QualityIssue[] = [...(aiQuality?.issues ?? [])];
  const sections = content.sections ?? [];

  let tables = 0;
  let charts = 0;
  let words = 0;

  for (const section of sections) {
    let sectionWords = 0;
    for (const block of section.blocks) {
      if (block.type === "table") {
        tables += 1;
        const widths = new Set(block.rows.map((r) => r.length));
        if (widths.size > 1) {
          issues.push({
            severity: "warning",
            area: "mise_en_page",
            message: `Tableau « ${block.title ?? section.title} » : lignes de longueurs inégales.`,
          });
        }
        if (block.rows.length > 26) {
          issues.push({
            severity: "info",
            area: "mise_en_page",
            message: `Tableau « ${block.title ?? section.title} » très long : risque de coupure entre deux pages.`,
          });
        }
      }
      if (block.type === "chart") {
        charts += 1;
        const empty = block.data.every((row) => block.series.every((s) => typeof row[s.key] !== "number"));
        if (empty) {
          issues.push({
            severity: "critical",
            area: "donnees",
            message: `Graphique « ${block.title} » sans valeur numérique exploitable.`,
          });
        }
      }
      if (block.type === "paragraph") sectionWords += block.text.split(/\s+/).length;
      if (block.type === "bullets") sectionWords += block.items.join(" ").split(/\s+/).length;
    }
    words += sectionWords;
    if (sectionWords < 25 && !section.blocks.some((b) => b.type === "table" || b.type === "chart")) {
      issues.push({
        severity: "warning",
        area: "completude",
        message: `Section « ${section.title} » très courte : page potentiellement déséquilibrée.`,
      });
    }
  }

  if (!content.executiveSummary) {
    issues.push({ severity: "critical", area: "completude", message: "Résumé exécutif absent." });
  }
  if (!charts) {
    issues.push({ severity: "warning", area: "donnees", message: "Aucun graphique généré à partir des données." });
  }
  if (!tables) {
    issues.push({ severity: "warning", area: "donnees", message: "Aucun tableau financier reconstruit." });
  }
  if (sections.length < 5) {
    issues.push({ severity: "warning", area: "coherence", message: "Structure incomplète : moins de 5 sections." });
  }

  const penalty = issues.reduce(
    (acc, i) => acc + (i.severity === "critical" ? 12 : i.severity === "warning" ? 5 : 1),
    0,
  );
  const base = typeof aiQuality?.score === "number" ? Math.min(100, Math.max(0, aiQuality.score)) : 92;
  const bonus = Math.min(8, Math.round(words / 400));
  const score = Math.max(20, Math.min(100, Math.round(base - penalty + bonus)));

  return {
    score,
    issues,
    strengths: aiQuality?.strengths ?? [],
    missing: aiQuality?.missing ?? [],
  };
}
