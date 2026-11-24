/**
 * KOOKY reasoning engine — GPT-5.6 Sol via Lovable AI (Responses API, streamed),
 * with native live web search. No SDK, plain fetch + SSE parsing.
 */
export const KOOKY_MODEL = "openai/gpt-6-sol"; // fallback; the lab model choice is passed per call

export type KookyEvent =
  | { type: "thinking"; text: string }
  | { type: "search"; query: string }
  | { type: "text"; text: string };

type CallOpts = {
  apiKey: string;
  model?: string;
  instructions: string;
  input: string;
  effort: "low" | "medium" | "high";
  schema?: { name: string; schema: Record<string, unknown> };
  webSearch?: boolean;
  onEvent?: (e: KookyEvent) => void;
  signal?: AbortSignal;
};

export class KookyAIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function kookyCall(opts: CallOpts): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? KOOKY_MODEL,
    instructions: opts.instructions,
    input: opts.input,
    stream: true,
    store: false,
    reasoning: { effort: opts.effort, summary: "auto" },
  };
  if (opts.webSearch) body["tools"] = [{ type: "web_search", search_context_size: "high" }];
  if (opts.schema) {
    body["text"] = { format: { type: "json_schema", name: opts.schema.name, schema: opts.schema.schema, strict: true } };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": opts.apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
    signal: opts.signal ?? null,
  });

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    let msg = raw.slice(0, 300);
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message || j?.message || msg;
    } catch {
      /* keep raw */
    }
    if (res.status === 402) msg = "Crédits Lovable AI insuffisants. Rechargez vos crédits pour continuer.";
    if (res.status === 429) msg = "Limite de requêtes IA atteinte. Réessayez dans un instant.";
    throw new KookyAIError(res.status, msg || `Erreur IA (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let failed: string | null = null;

  const handle = (data: string) => {
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    const type = ev["type"] as string;
    if (type === "response.output_text.delta") {
      const d = ev["delta"] as string;
      output += d;
      opts.onEvent?.({ type: "text", text: d });
    } else if (type === "response.reasoning_summary_text.delta") {
      opts.onEvent?.({ type: "thinking", text: ev["delta"] as string });
    } else if (type === "response.output_item.done") {
      const item = ev["item"] as { type?: string; action?: { query?: string } } | undefined;
      if (item?.type === "web_search_call" && item.action?.query) {
        opts.onEvent?.({ type: "search", query: item.action.query });
      }
    } else if (type === "response.failed" || type === "error") {
      const r = ev["response"] as { error?: { message?: string } } | undefined;
      failed = r?.error?.message || (ev["message"] as string) || "La génération a échoué.";
    } else if (type === "response.completed") {
      const r = ev["response"] as { output_text?: string } | undefined;
      if (!output && r?.output_text) output = r.output_text;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) handle(line.slice(6));
      }
    }
  }
  if (failed) throw new KookyAIError(500, failed);
  return output.trim();
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("Réponse IA illisible (JSON attendu).");
  }
}

/* ---------- Schemas (strict-compatible) ---------- */
const nullableString = { type: ["string", "null"] };

export const discoverySchema = {
  name: "kooky_discovery",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["companies"],
    properties: {
      companies: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "website", "city", "country", "reason"],
          properties: {
            name: { type: "string" },
            website: nullableString,
            city: nullableString,
            country: nullableString,
            reason: { type: "string" },
          },
        },
      },
    },
  },
};

export const analysisSchema = {
  name: "kooky_analysis",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "company_name",
      "website",
      "email",
      "phone",
      "street",
      "city",
      "zip",
      "country",
      "sector",
      "company_size",
      "summary",
      "analysis",
      "approach",
      "score",
      "contacts",
      "sources",
    ],
    properties: {
      company_name: { type: "string" },
      website: nullableString,
      email: nullableString,
      phone: nullableString,
      street: nullableString,
      city: nullableString,
      zip: nullableString,
      country: nullableString,
      sector: nullableString,
      company_size: nullableString,
      summary: { type: "string" },
      analysis: { type: "string" },
      approach: { type: "string" },
      score: { type: "integer" },
      contacts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "role", "email", "phone", "linkedin"],
          properties: {
            name: { type: "string" },
            role: nullableString,
            email: nullableString,
            phone: nullableString,
            linkedin: nullableString,
          },
        },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "url"],
          properties: { title: { type: "string" }, url: { type: "string" } },
        },
      },
    },
  },
};

export type Discovery = {
  companies: { name: string; website: string | null; city: string | null; country: string | null; reason: string }[];
};
export type Analysis = {
  company_name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  sector: string | null;
  company_size: string | null;
  summary: string;
  analysis: string;
  approach: string;
  score: number;
  contacts: { name: string; role: string | null; email: string | null; phone: string | null; linkedin: string | null }[];
  sources: { title: string; url: string }[];
};

/* ---------- Prompts ---------- */
export const DISCOVERY_INSTRUCTIONS = `Tu es KOOKY, un analyste en prospection B2B d'élite. Tu utilises la recherche web en direct pour identifier des entreprises RÉELLES et VÉRIFIABLES correspondant à la demande.
Règles strictes :
- Chaque entreprise doit exister réellement ; vérifie-la via le web (site officiel, annuaire, presse). Aucune invention.
- Diversifie les résultats (tailles, sous-segments, villes) tout en restant fidèle au secteur et à la zone demandés.
- Exclus les entreprises listées comme déjà connues.
- Renvoie EXACTEMENT le nombre demandé (ou moins uniquement si le marché est trop petit), avec le site web officiel quand tu le trouves.
- "reason" : une phrase précise expliquant pourquoi c'est un prospect pertinent.
Réponds uniquement avec le JSON demandé.`;

export const ANALYSIS_INSTRUCTIONS = `Tu es KOOKY, un analyste en intelligence commerciale d'élite. Ta mission : produire un dossier complet et rigoureux sur UNE entreprise afin qu'un commercial puisse l'approcher avec subtilité et maximiser la conversion.
Méthode obligatoire :
1. Recherche web approfondie et multiple (site officiel, pages "à propos"/équipe/contact, LinkedIn, annuaires, registres légaux, presse, avis clients, offres d'emploi, réseaux sociaux). Prends ton temps, croise les sources, ne garde que des informations vérifiées ou clairement signalées comme probables.
2. Renseigne les coordonnées exactes (email générique ou nommé, téléphone, adresse complète, pays) uniquement si trouvées ; sinon null.
3. Identifie les décideurs pertinents (dirigeants, responsables achats/marketing/opérations selon le contexte) avec leur rôle.
4. Rédige en français, en Markdown structuré :
   - "summary" : 2-3 phrases qui résument l'entreprise et son intérêt.
   - "analysis" : dossier détaillé avec sections ## Identité & activité, ## Taille, chiffres & structure, ## Actualités & signaux d'achat, ## Enjeux & points de douleur probables, ## Présence digitale & réputation, ## Concurrence & positionnement, ## Points de vigilance. Sois factuel, précis, cite les faits datés.
   - "approach" : plan d'approche commerciale : ## Angle d'accroche personnalisé, ## Canal & timing recommandés, ## Message d'ouverture (prêt à envoyer), ## Objections probables & réponses, ## Prochaines étapes.
5. "score" : pertinence du prospect de 0 à 100 (adéquation au besoin, signaux d'achat, accessibilité des décideurs).
6. "sources" : liste des URLs réellement consultées.
Réponds uniquement avec le JSON demandé.`;
