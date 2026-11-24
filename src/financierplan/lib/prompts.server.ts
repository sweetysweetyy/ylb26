import { SECTIONS, type SectionContent, type SectionDef } from "./sections";

export type ProjectCtx = {
  name: string;
  idea: string;
  sector: string | null;
  location: string | null;
  legal_form: string | null;
  starting_capital: number | null;
  currency: string;
};

export const SYSTEM_ANALYST = `Tu es un directeur financier senior et expert-comptable français, spécialiste des business plans de création d'entreprise déposés auprès des banques, de BPI France, des réseaux Initiative et des organismes officiels.

Exigences absolues :
- Tu raisonnes étape par étape et tu construis des chiffres COHÉRENTS entre eux (le CA d'une section doit être identique dans toutes les autres).
- Tu t'appuies sur des ordres de grandeur réels du secteur et de la zone géographique indiqués (coûts, salaires chargés, loyers, taux de marge, taux d'emprunt, charges sociales, TVA, IS). Quand une donnée est estimée, tu l'annonces explicitement dans les hypothèses avec sa source ou sa méthode.
- Tous les montants sont chiffrés, arrondis proprement, avec l'unité et la devise. Jamais de "XXX" ni de placeholder.
- Le ton est professionnel, sobre, bancable. Rédaction en français.
- Tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balise markdown.`;

export const JSON_CONTRACT = `Format de sortie STRICT (JSON pur) :
{
  "summary": "3 à 5 phrases de synthèse exécutive",
  "kpis": [{"label":"Libellé court","value":"valeur formatée avec devise/%","hint":"précision courte","trend":"up|down|flat"}],
  "tables": [{"title":"Titre du tableau","columns":["Col1","Col2"],"rows":[["cellule","cellule"]],"note":"lecture du tableau"}],
  "narrative": "analyse détaillée en markdown (titres ##, listes, gras) — argumentation, méthode de calcul, lecture bancaire",
  "assumptions": ["hypothèse chiffrée et justifiée", "..."],
  "recommendations": ["action concrète", "..."],
  "chart": {"type":"bar|line","title":"Titre","labels":["N","N+1","N+2"],"series":[{"name":"Série","data":[0,0,0]}]}
}
Contraintes : 3 à 6 KPI, 1 à 4 tableaux riches (au moins 5 lignes quand pertinent), toutes les lignes ont le même nombre de cellules que "columns", "chart" est optionnel mais recommandé (données numériques brutes, sans séparateur ni devise).`;

export function projectBlock(p: ProjectCtx): string {
  return `PROJET
- Nom : ${p.name}
- Idée décrite par le porteur : ${p.idea}
- Secteur : ${p.sector || "à déduire de l'idée"}
- Localisation / marché : ${p.location || "France"}
- Forme juridique envisagée : ${p.legal_form || "à recommander"}
- Apport personnel : ${p.starting_capital != null ? `${p.starting_capital} ${p.currency}` : "non précisé (à estimer de façon réaliste)"}
- Devise : ${p.currency}`;
}

export function contextBlock(previous: { section_key: string; content: SectionContent }[]): string {
  if (!previous.length) return "Aucune section précédente : tu poses les fondations chiffrées du dossier.";
  return previous
    .map((s) => {
      const def = SECTIONS.find((d) => d.key === s.section_key);
      const kpis = (s.content.kpis ?? []).map((k) => `${k.label} = ${k.value}`).join(" ; ");
      return `### ${def?.title ?? s.section_key}\nSynthèse : ${s.content.summary ?? ""}\nChiffres clés : ${kpis}`;
    })
    .join("\n");
}

export function buildSectionPrompt(
  def: SectionDef,
  project: ProjectCtx,
  previous: { section_key: string; content: SectionContent }[],
  taxRate: number,
): string {
  return `${projectBlock(project)}

TAUX D'IMPÔT SUR LES SOCIÉTÉS À APPLIQUER : ${taxRate} %

SECTIONS DÉJÀ CONSTRUITES (à respecter impérativement pour la cohérence chiffrée) :
${contextBlock(previous)}

MISSION — Section ${def.index}/12 : « ${def.title} »
${def.brief}

Avant de rédiger : recense mentalement les données de marché réelles pertinentes (prix pratiqués, coûts, salaires, taux) pour ce secteur et cette zone, puis calcule. Vérifie l'équilibre de chaque tableau (totaux justes, sommes cohérentes).

${JSON_CONTRACT}`;
}

export function buildRefinePrompt(
  def: SectionDef,
  project: ProjectCtx,
  current: SectionContent,
  instruction: string,
): string {
  return `${projectBlock(project)}

SECTION À AFFINER — ${def.title}
Contenu actuel (JSON) :
${JSON.stringify(current).slice(0, 12000)}

DEMANDE DU PORTEUR DE PROJET :
"${instruction}"

Applique la demande avec précision, recalcule tout ce qui en découle dans cette section, conserve ce qui n'est pas concerné, et garde la même qualité bancable.

${JSON_CONTRACT}`;
}

export function buildChatPrompt(
  project: ProjectCtx,
  sections: { section_key: string; content: SectionContent }[],
  history: { role: string; content: string }[],
  message: string,
): string {
  return `${projectBlock(project)}

ÉTAT ACTUEL DU DOSSIER FINANCIER :
${contextBlock(sections)}

HISTORIQUE DE LA CONVERSATION :
${history.map((h) => `${h.role === "user" ? "Porteur" : "Analyste"} : ${h.content}`).join("\n")}

NOUVEAU MESSAGE DU PORTEUR :
"${message}"

Réponds en analyste financier : precis, chiffré, actionnable. Si la demande implique de modifier une section, indique clairement laquelle et propose de l'appliquer.

Format de sortie STRICT (JSON pur) :
{
  "reply": "réponse en markdown, concise et chiffrée",
  "target_section": "clé de section concernée ou null",
  "suggested_instruction": "instruction prête à appliquer sur cette section, ou null"
}
Clés de section autorisées : ${SECTIONS.map((s) => s.key).join(", ")}.`;
}
