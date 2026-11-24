const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquant côté serveur");
  return key;
}

export async function aiText(opts: {
  model: string;
  messages: ChatMessage[];
  json?: boolean;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: false,
  };
  if (opts.model.startsWith("openai/gpt-5")) body["reasoning_effort"] = "none";
  if (opts.json) body["response_format"] = { type: "json_object" };

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) throw new Error("Limite de requêtes IA atteinte, réessayez dans un instant.");
    if (response.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits pour continuer.");
    throw new Error(`Erreur IA [${response.status}]: ${text.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate.trim();
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  return candidate.slice(start, end + 1).trim();
}

export async function aiJson<T>(opts: {
  model: string;
  system: string;
  prompt: string;
  fallback: T;
}): Promise<T> {
  try {
    const raw = await aiText({
      model: opts.model,
      json: true,
      messages: [
        { role: "system", content: `${opts.system}\n\nRéponds STRICTEMENT en JSON valide (json), sans commentaire.` },
        { role: "user", content: opts.prompt },
      ],
    });
    return JSON.parse(extractJson(raw)) as T;
  } catch (error) {
    console.error("aiJson failed", error);
    if (error instanceof Error && /Limite de requêtes|Crédits IA/.test(error.message)) throw error;
    return opts.fallback;
  }
}
