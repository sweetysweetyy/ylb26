const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | unknown[];
};

function buildBody(model: string, messages: ChatMessage[], json: boolean) {
  const body: Record<string, unknown> = { model, messages };
  if (json) body.response_format = { type: "json_object" };
  // GPT-5.6 family rejects any reasoning effort other than "none".
  if (model.includes("gpt-5.6")) body.reasoning_effort = "none";
  return body;
}

/**
 * Lecture multimodale d'un document (PDF scanné, image…) par le modèle choisi
 * par l'utilisateur. Sert de repli quand l'extraction texte échoue.
 */
export async function transcribeDocument(
  model: string,
  dataUrl: string,
  filename: string,
): Promise<string> {
  const isImage = /^data:image\//i.test(dataUrl);
  const filePart = isImage
    ? { type: "image_url", image_url: { url: dataUrl } }
    : { type: "file", file: { filename, file_data: dataUrl } };

  return callAI(model, [
    {
      role: "system",
      content:
        "Tu retranscris fidèlement le contenu textuel d'un document, sans commentaire ni mise en forme superflue.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Retranscris intégralement le texte de ce document (CV ou lettre de motivation), en conservant l'ordre et les sections. Réponds uniquement avec le texte brut.",
        },
        filePart,
      ],
    },
  ]);
}


export async function callAI(
  model: string,
  messages: ChatMessage[],
  options: { json?: boolean } = {},
): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY manquante côté serveur.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(model, messages, options.json ?? false)),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      throw new Error("Limite de requêtes IA atteinte. Réessayez dans quelques instants.");
    }
    if (response.status === 402) {
      throw new Error("Crédits IA épuisés. Ajoutez des crédits à votre espace de travail.");
    }
    throw new Error(`Erreur IA [${response.status}] : ${text.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Robust JSON extraction: handles fenced blocks and leading prose. */
export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/gim, "")
    .replace(/```$/gim, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const endObj = cleaned.lastIndexOf("}");
    const endArr = cleaned.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("Réponse IA illisible (JSON invalide).");
  }
}

export async function callAIJson<T>(
  model: string,
  messages: ChatMessage[],
  retries = 1,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await callAI(model, messages, { json: true });
      return parseJsonLoose<T>(raw);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /Limite de requêtes|Crédits/.test(error.message)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Échec de l'analyse IA.");
}
