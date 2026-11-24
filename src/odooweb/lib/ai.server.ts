const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Clé IA manquante côté serveur.");
  return key;
}

function gatewayError(status: number) {
  if (status === 429) return new Error("Trop de demandes IA d'un coup. Réessayez dans un instant.");
  if (status === 402) return new Error("Crédits IA épuisés. Ajoutez des crédits pour continuer.");
  return new Error(`Le service IA a répondu ${status}.`);
}

/**
 * Appelle GPT 5.6 Sol via l'API Responses en streaming (obligatoire pour les
 * modèles de raisonnement) et renvoie le JSON structuré final.
 */
export async function solStructured<T>(input: {
  instructions: string;
  prompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  model?: string;
}): Promise<T> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: input.model ?? "openai/gpt-5.6-sol",
      stream: true,
      instructions: input.instructions,
      input: input.prompt,
      reasoning: { effort: "medium", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) throw gatewayError(res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as { type?: string; delta?: string };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        }
      } catch {
        // ignore les fragments non-JSON
      }
    }
  }

  if (!text.trim()) throw new Error("L'IA n'a rien renvoyé. Réessayez.");
  return JSON.parse(text) as T;
}

/** Génère une image et renvoie son contenu en base64 (sans préfixe data:). */
export async function generateImageBase64(prompt: string): Promise<string | null> {
  try {
    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey(),
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        modalities: ["image", "text"],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) return null;
    const comma = url.indexOf(",");
    return comma >= 0 ? url.slice(comma + 1) : null;
  } catch {
    return null;
  }
}
