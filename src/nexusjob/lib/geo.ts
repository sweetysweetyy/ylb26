/** Connaissance géographique de La Réunion pour cibler et filtrer les offres. */

export const REUNION_CITIES = [
  "Saint-Denis",
  "Saint-Paul",
  "Saint-Pierre",
  "Le Tampon",
  "Saint-André",
  "Saint-Louis",
  "Le Port",
  "Saint-Joseph",
  "Sainte-Marie",
  "Saint-Benoît",
  "La Possession",
  "Saint-Leu",
  "Sainte-Suzanne",
  "Petite-Île",
  "Bras-Panon",
  "Étang-Salé",
  "Saint-Philippe",
  "Sainte-Rose",
  "Trois-Bassins",
  "Cilaos",
  "Salazie",
  "Entre-Deux",
  "Les Avirons",
  "Sainte-Anne",
];

const REUNION_HINTS = [
  "la reunion",
  "ile de la reunion",
  "île de la réunion",
  "reunion island",
  "974",
  "97400",
  "97410",
  "97420",
  "97430",
  "97436",
  "97440",
  "97450",
  "97460",
  "97470",
  "97480",
  "97490",
  "dom-tom",
  "outre-mer",
  ...REUNION_CITIES,
].map((s) => normalize(s));

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Détecte si un texte (localisation ou contenu d'offre) concerne La Réunion. */
export function mentionsRegion(text: string, region: string): boolean {
  const haystack = normalize(text);
  if (!haystack) return false;
  if (isReunion(region)) {
    return REUNION_HINTS.some((hint) => haystack.includes(hint));
  }
  const needle = normalize(region);
  return needle ? haystack.includes(needle) : true;
}

export function isReunion(region: string | null | undefined) {
  const n = normalize(region ?? "");
  return !n || n.includes("reunion") || n.includes("974");
}

/** Termes de localisation injectés dans les requêtes de recherche. */
export function regionQueryTerms(region: string): string[] {
  if (isReunion(region)) {
    return [
      "La Réunion",
      "974",
      "Saint-Denis 974",
      "Saint-Pierre Réunion",
      "Saint-Paul Réunion",
      "Le Tampon Réunion",
      "Réunion île",
    ];
  }
  return [region];
}
