/**
 * Passerelle Lovable AI — appels serveur uniquement.
 * Modèles OpenAI -> API Responses (streaming obligatoire, consommé côté serveur).
 * Autres modèles -> chat completions.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError("Clé Lovable AI manquante.", 500);
  return key;
}

function friendly(status: number, body: string): AiError {
  if (status === 429)
    return new AiError(
      "Limite de requêtes IA atteinte. Réessayez dans quelques instants.",
      429,
    );
  if (status === 402)
    return new AiError(
      "Crédits IA épuisés. Ajoutez des crédits dans les paramètres de votre espace Lovable.",
      402,
    );
  return new AiError(`Erreur IA (${status}) : ${body.slice(0, 400)}`, status);
}

async function readSse(res: Response, onDelta?: (t: string) => void): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string | { content?: string };
          response?: { output_text?: string };
          choices?: { delta?: { content?: string } }[];
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
          onDelta?.(evt.delta);
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!out) out = evt.response.output_text;
        } else if (evt.choices?.[0]?.delta?.content) {
          const chunk = evt.choices[0].delta.content;
          out += chunk;
          onDelta?.(chunk);
        }
      } catch {
        /* fragment ignoré */
      }
    }
  }
  return out;
}

async function callResponses(model: string, system: string, prompt: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });
  if (!res.ok || !res.body) {
    throw friendly(res.status, await res.text().catch(() => ""));
  }
  return readSse(res);
}

async function callChat(model: string, system: string, prompt: string): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: true,
  };
  if (model.includes("gpt-5.6")) body["reasoning_effort"] = "none";

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw friendly(res.status, await res.text().catch(() => ""));
  }
  return readSse(res);
}

export async function aiComplete(
  model: string,
  system: string,
  prompt: string,
): Promise<string> {
  if (model.startsWith("openai/")) {
    try {
      const text = await callResponses(model, system, prompt);
      if (text.trim()) return text;
    } catch (error) {
      if (error instanceof AiError && (error.status === 429 || error.status === 402)) throw error;
      console.error("[ai] responses fallback:", error);
    }
  }
  return callChat(model, system, prompt);
}

/** Extrait le premier objet JSON valide d'une réponse texte. */
export function extractJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* on tente une extraction bornée */
  }
  const start = cleaned.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i]!;
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        }
      }
    }
  }
  throw new AiError("La réponse de l'IA n'a pas pu être interprétée. Relancez la génération.", 502);
}
