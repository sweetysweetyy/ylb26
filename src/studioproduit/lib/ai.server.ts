/**
 * Server-only helpers for Lovable AI Gateway.
 * GPT-5.6 Sol does all the reasoning / creative direction.
 * GPT-image-2 renders exactly what Sol describes.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquante");
  return key;
}

function gatewayError(status: number, body: string) {
  if (status === 429) return new Error("Trop de demandes en même temps. Réessayez dans un instant.");
  if (status === 402)
    return new Error("Crédits IA épuisés. Ajoutez des crédits pour continuer à générer des photos.");
  if (status === 403) return new Error("L'accès à l'IA est bloqué pour cet espace de travail.");
  return new Error(`Erreur IA (${status}) : ${body.slice(0, 300)}`);
}

export type SolContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

/**
 * Calls GPT-5.6 Sol through the Responses API with a strict JSON schema.
 * Always streaming (reasoning runs can last minutes); consumed server-side.
 */
export async function askSol<T>(params: {
  instructions: string;
  content: SolContent[];
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
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
      model: params.model ?? "openai/gpt-5.6-sol",
      instructions: params.instructions,
      input: [{ role: "user", content: params.content }],
      stream: true,
      reasoning: { effort: params.effort ?? "medium", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw gatewayError(res.status, await res.text().catch(() => ""));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
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
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text && evt.response?.output_text) {
          text = evt.response.output_text;
        }
      } catch {
        /* ignore keep-alive / partial frames */
      }
    }
  }

  if (!text.trim()) throw new Error("L'IA n'a rien renvoyé. Réessayez.");
  return JSON.parse(text) as T;
}

/** Renders a scene with GPT-image-2, keeping the real product from the source photo. */
export async function renderScene(params: {
  prompt: string;
  image: Uint8Array;
  mimeType: string;
  size: "1024x1024" | "1024x1536" | "1536x1024";
}): Promise<Uint8Array> {
  const form = new FormData();
  form.append("model", "openai/gpt-image-2");
  form.append("prompt", params.prompt);
  form.append("size", params.size);
  form.append("n", "1");
  form.append(
    "image",
    new Blob([params.image as unknown as BlobPart], { type: params.mimeType }),
    "product.png",
  );

  const res = await fetch(`${GATEWAY}/images/edits`, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: form,
  });

  const raw = await res.text();
  if (!res.ok) throw gatewayError(res.status, raw);

  const json = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = json.data?.[0];
  if (item?.b64_json) {
    const bin = atob(item.b64_json);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  if (item?.url) {
    const img = await fetch(item.url);
    return new Uint8Array(await img.arrayBuffer());
  }
  throw new Error("Aucune image renvoyée par le générateur.");
}
