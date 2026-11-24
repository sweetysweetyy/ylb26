export const CV_EXTRACTION_SYSTEM = `Tu es un expert RH francophone spécialisé dans l'analyse de CV et de lettres de motivation.
Tu extrais des données structurées, factuelles, sans jamais inventer.
Si une information est absente, renvoie une chaîne vide ou un tableau vide.
Tu réponds UNIQUEMENT avec un objet JSON valide.`;

export function cvExtractionPrompt(kind: "cv" | "cover_letter", text: string, existing: string) {
  const label = kind === "cv" ? "un CV" : "une lettre de motivation";
  return `Voici le texte brut extrait de ${label} :
---
${text.slice(0, 45000)}
---

Profil déjà connu de l'utilisateur (à compléter, ne pas écraser une donnée valide par du vide) :
${existing}

Renvoie un objet JSON avec exactement cette structure :
{
  "full_name": "",
  "headline": "titre professionnel court",
  "email": "",
  "phone": "",
  "location": "ville, pays",
  "summary": "résumé professionnel de 3 à 5 phrases, rédigé à la première personne",
  "years_experience": 0,
  "skills": [{"name": "", "level": "débutant|intermédiaire|avancé|expert", "category": "technique|outil|métier"}],
  "soft_skills": [""],
  "experiences": [{"title": "", "company": "", "location": "", "start": "MM/AAAA", "end": "MM/AAAA ou Aujourd'hui", "description": "", "achievements": [""]}],
  "educations": [{"degree": "", "school": "", "year": "", "details": ""}],
  "languages": [{"name": "", "level": ""}],
  "certifications": [{"name": "", "issuer": "", "year": ""}],
  "links": [{"label": "", "url": ""}],
  "motivations": ["motivations / objectifs de carrière détectés"]
}`;
}

export const QUERY_SYSTEM = `Tu es un stratège en sourcing d'emploi spécialisé sur le marché local français, notamment La Réunion (974).
Tu conçois des requêtes de recherche web qui ramènent de VRAIES pages d'offres d'emploi, jamais des pages de catégories vides.
Tu élargis intelligemment : si le poste exact est rare, tu vises les métiers voisins du même secteur d'activité.
Réponds uniquement en JSON valide.`;

export function queryPrompt(
  profileSummary: string,
  prefs: string,
  sources: string,
  options: {
    region: string;
    regionTerms: string[];
    sector: string;
    flexibility: string;
    round: number;
    alreadyFound: number;
    minResults: number;
  },
) {
  const widening =
    options.round > 1
      ? `\nTOUR ${options.round} — seulement ${options.alreadyFound} offre(s) pertinente(s) trouvée(s) sur ${options.minResults} souhaitées.
ÉLARGIS : intitulés voisins, métiers connexes du même secteur, synonymes, niveaux de séniorité adjacents,
autres communes de la région. Ne répète pas les requêtes précédentes.`
      : "";

  return `Profil du candidat :
${profileSummary}

Préférences de recherche :
${prefs}

Secteur d'activité visé : ${options.sector || "à déduire du profil"}
Région imposée : ${options.region} (termes à utiliser : ${options.regionTerms.join(", ")})
Souplesse demandée : ${options.flexibility} (strict = coller au poste ; balanced = poste + métiers proches ; large = tout le secteur d'activité)

Sources ciblées (id → domaine) :
${sources}
${widening}

Génère pour CHAQUE source 2 requêtes de recherche web complémentaires (français) qui ramènent des pages
d'offres réellement situées dans la région imposée. Inclus systématiquement un terme géographique de la région.
Maximum 18 mots par requête, pas de guillemets inutiles.

Format JSON attendu :
{ "queries": [{ "source": "id_source", "query": "..." }], "profile_keywords": ["mots-clés métier du profil"], "sector": "secteur d'activité déduit" }`;
}

export const SCORING_SYSTEM = `Tu es un analyste de recrutement senior. Tu compares un profil candidat à des offres d'emploi réelles
et tu produis une fiche d'analyse rigoureuse et honnête. Tu n'inventes jamais d'information absente de l'offre.

Le score de compatibilité est un entier 0-100, détaillé en sous-scores :
- skills (0-40) adéquation des compétences
- experience (0-25) niveau et années d'expérience
- location (0-15) localisation réelle de l'offre vs région visée
- contract (0-10) type de contrat et séniorité
- motivation (0-10) alignement secteur / motivations

La recherche n'est PAS stricte : une offre du même secteur d'activité ou d'un métier proche reste pertinente,
avec un score plus bas et match_type = "proche" ou "secteur". Utilise "exact" seulement pour une correspondance directe.
Réponds uniquement avec un objet JSON valide.`;

export function scoringPrompt(
  profileSummary: string,
  prefs: string,
  offersBlock: string,
  options: { region: string; sector: string; flexibility: string },
) {
  return `PROFIL CANDIDAT :
${profileSummary}

PRÉFÉRENCES :
${prefs}

RÉGION VISÉE : ${options.region}
SECTEUR VISÉ : ${options.sector || "déduit du profil"}
SOUPLESSE : ${options.flexibility}

OFFRES BRUTES (contenu extrait du web) :
${offersBlock}

Pour chaque offre, produis une fiche. Mets "is_job_offer": false pour les pages de liste, catégories,
pages vides ou articles qui ne sont pas une offre unique. Indique la localisation RÉELLE trouvée dans l'offre
et region_match = "in_region" | "out_of_region" | "unknown" par rapport à la région visée.

Format JSON attendu :
{
  "offers": [{
    "index": 0,
    "is_job_offer": true,
    "title": "",
    "company": "",
    "location": "ville réelle indiquée dans l'offre",
    "region_match": "in_region|out_of_region|unknown",
    "sector": "secteur d'activité de l'offre",
    "match_type": "exact|proche|secteur",
    "salary": "texte du salaire ou vide",
    "contract_type": "CDI|CDD|Alternance|Stage|Freelance|Intérim|Inconnu",
    "remote": "onsite|hybrid|remote|unknown",
    "seniority": "junior|confirmé|senior|lead|inconnu",
    "posted_at": "",
    "summary": "résumé de l'offre en 2-3 phrases",
    "score": 0,
    "score_breakdown": {"skills": 0, "experience": 0, "location": 0, "contract": 0, "motivation": 0},
    "matching_skills": ["compétences du profil réellement demandées par l'offre"],
    "missing_skills": ["compétences demandées absentes du profil"],
    "keyword_matches": ["mots-clés communs profil ↔ offre"],
    "keyword_gaps": ["mots-clés importants de l'offre absents du profil"],
    "strengths": ["pourquoi ce candidat est pertinent"],
    "risks": ["points de vigilance / écarts"],
    "interview_tips": ["conseils concrets pour l'entretien"],
    "cover_letter_hook": "phrase d'accroche personnalisée pour la candidature",
    "reasoning": "justification courte et concrète du score, en citant les écarts"
  }]
}`;
}
