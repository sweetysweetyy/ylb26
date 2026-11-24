import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";


export async function askModel(model: string, system: string, prompt: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA manquante côté serveur.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      if (!res.ok) {
        const body = await res.clone().text().catch(() => "");
        if (res.status === 402) throw new Error("Crédits IA épuisés : ajoutez des crédits pour continuer.");
        if (res.status === 429) throw new Error("Trop de requêtes IA, réessayez dans un instant.");
        if (res.status === 403) throw new Error("Accès IA refusé pour cet espace de travail.");
        console.error("AI gateway", res.status, body.slice(0, 400));
      }
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(model),
    system,
    prompt,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

export function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Réponse IA illisible.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
