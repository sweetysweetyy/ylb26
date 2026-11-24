/**
 * Prompts additionnels : planification de recherche pilotée par l'IA
 * (l'IA configure elle-même Firecrawl) et fiche entreprise.
 */

export const PLAN_SYSTEM = `Tu es un architecte de recherche d'emploi. Tu transformes la description libre d'un candidat
(en langage naturel) + son profil en un PLAN DE RECHERCHE opérationnel pour le moteur Firecrawl.
Tu comprends l'intention réelle : métier visé, secteur, contraintes, envies, ce qu'il refuse.
Tu règles toi-même les paramètres techniques de Firecrawl pour maximiser la pertinence.
Tu réponds UNIQUEMENT avec un objet JSON valide.`;

export function planPrompt(
  profileSummary: string,
  prefsText: string,
  brief: string,
  sources: string,
  options: { region: string; regionTerms: string[]; minResults: number },
) {
  return `PROFIL DU CANDIDAT :
${profileSummary}

PRÉFÉRENCES ENREGISTRÉES :
${prefsText}

DESCRIPTION LIBRE DU CANDIDAT (sa vraie demande, à respecter en priorité) :
"""
${(brief || "(aucune description fournie, déduis tout du profil et des préférences)").slice(0, 4000)}
"""

RÉGION IMPOSÉE : ${options.region} (termes géographiques utilisables : ${options.regionTerms.join(", ")})
NOMBRE MINIMUM D'OFFRES ATTENDU : ${options.minResults}

SOURCES DISPONIBLES (id → domaine) :
${sources}

Produis un plan de recherche. Les requêtes doivent ramener de VRAIES pages d'offres situées dans la région,
jamais des pages de catégories. Chaque requête contient un terme géographique de la région.
Choisis des réglages Firecrawl réalistes : limit 4-10, tbs parmi "" | "qdr:d" | "qdr:w" | "qdr:m",
proxy parmi "auto" | "basic" | "stealth", waitFor 1000-6000, scrollSteps 2-8.

Format JSON attendu :
{
  "interpretation": "ce que le candidat veut vraiment, en 2-3 phrases",
  "target_roles": ["intitulés de poste à viser, du plus proche au plus large"],
  "sector": "secteur d'activité déduit",
  "must_have": ["critères non négociables détectés"],
  "nice_to_have": ["critères souhaitables"],
  "deal_breakers": ["ce que le candidat refuse"],
  "locations": ["communes prioritaires"],
  "contract_types": ["CDI", "CDD", "..."],
  "remote": "any|onsite|hybrid|remote",
  "keywords": ["mots-clés métier décisifs"],
  "negative_keywords": ["mots-clés à écarter des résultats"],
  "firecrawl": {
    "limit": 6,
    "tbs": "",
    "country": "fr",
    "languages": ["fr"],
    "onlyMainContent": true,
    "proxy": "auto",
    "waitFor": 2500,
    "scrollSteps": 4,
    "deepScrape": true,
    "formats": ["markdown"],
    "reasoning": "pourquoi ces réglages pour cette recherche"
  },
  "queries": [{ "source": "id_source", "query": "...", "intent": "ce que cette requête cherche" }],
  "ranking_hints": ["ce qui doit faire monter le score d'une offre pour ce candidat"]
}`;
}

export const COMPANY_SYSTEM = `Tu es un analyste business et un coach d'entretien. À partir de pages web réelles,
tu produis une fiche entreprise complète, factuelle et utile pour préparer un entretien d'embauche.
Tu n'inventes jamais : si une information est absente, laisse la chaîne vide ou le tableau vide.
Tu réponds UNIQUEMENT avec un objet JSON valide.`;

export function companyPrompt(company: string, profileSummary: string, docs: string, context: string) {
  return `ENTREPRISE ANALYSÉE : ${company}
${context ? `CONTEXTE (offre liée) : ${context}` : ""}

PROFIL DU CANDIDAT (pour personnaliser la préparation) :
${profileSummary}

PAGES WEB COLLECTÉES :
${docs.slice(0, 40000)}

Format JSON attendu :
{
  "company": "nom officiel",
  "website": "site officiel",
  "location": "siège / implantations",
  "sector": "secteur d'activité",
  "size": "taille / effectif",
  "founded": "année de création",
  "overview": "présentation en 4-6 phrases",
  "activities": ["activités et métiers de l'entreprise"],
  "products": ["produits, services, marques"],
  "culture": ["valeurs, ambiance, mode de management, avantages"],
  "news": [{"title": "actualité récente", "detail": "", "date": "", "url": ""}],
  "key_people": [{"name": "", "role": ""}],
  "strengths": ["atouts de l'entreprise"],
  "risks": ["points de vigilance pour un candidat"],
  "interview_questions": ["questions probables posées au candidat"],
  "questions_to_ask": ["questions pertinentes que le candidat peut poser"],
  "talking_points": ["arguments personnalisés reliant le profil du candidat à l'entreprise"]
}`;
}
