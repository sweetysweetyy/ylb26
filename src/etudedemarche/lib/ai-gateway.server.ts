const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Appel du Lovable AI Gateway en streaming (les octets circulent en continu,
 * ce qui évite les coupures sur les générations longues). Le texte complet est
 * reconstitué côté serveur.
 */
export async function callAi(
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number } = {},
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiGatewayError(500, "Clé du moteur IA manquante.");

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };
  if (options.temperature !== undefined && !model.startsWith("openai/")) {
    body["temperature"] = options.temperature;
  }
  if (model.startsWith("openai/gpt-5.6")) {
    body["reasoning_effort"] = "none";
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new AiGatewayError(429, "Limite de requêtes IA atteinte, réessayez dans un instant.");
    }
    if (res.status === 402) {
      throw new AiGatewayError(402, "Crédits IA épuisés. Rechargez votre espace de travail Lovable.");
    }
    throw new AiGatewayError(res.status, `Le moteur IA a répondu ${res.status}. ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) text += delta;
      } catch {
        /* fragment partiel — ignoré */
      }
    }
  }

  return text.trim();
}

/** Extrait un objet JSON d'une réponse IA, même si elle contient du texte autour. */
export function parseJsonResponse<T>(raw: string): T {
  let candidate = raw.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) candidate = fence[1].trim();
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last > first) candidate = candidate.slice(first, last + 1);
  return JSON.parse(candidate) as T;
}