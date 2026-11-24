const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user";
  content: unknown;
};

export async function callGateway(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Le service d'IA n'est pas configuré.");

  const body: Record<string, unknown> = {
    model,
    messages,
    response_format: { type: "json_object" },
  };
  if (model.startsWith("openai/gpt-5.6")) body["reasoning_effort"] = "none";

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Limite de requêtes atteinte. Réessayez dans une minute.");
  if (res.status === 402) throw new Error("Crédits IA épuisés. Rechargez votre espace de travail.");
  if (!res.ok) {
    const detail = await res.text();
    console.error("[AI]", res.status, detail.slice(0, 800));
    throw new Error(`L'analyse a échoué (${res.status}).`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide du modèle d'IA.");
  return content;
}

export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("Le modèle a renvoyé une réponse illisible.");
  }
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
