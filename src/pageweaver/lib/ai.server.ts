// Server-only helpers for the Lovable AI Gateway (raw fetch, no SDK, streamed then accumulated).
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const ANALYSIS_MODEL = "openai/gpt-5.6-luna"; // comprehension / analysis
export const MOCKUP_MODEL = "google/gemini-3.1-flash-lite"; // cheapest model for HTML mockups

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("Configuration IA manquante.");
  return k;
}

async function fail(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  if (res.status === 429) throw new Error("Trop de demandes en même temps. Réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits à votre espace de travail.");
  let msg = text;
  try {
    const j = JSON.parse(text);
    msg = j?.error?.message ?? j?.message ?? text;
  } catch {}
  throw new Error(`Erreur IA (${res.status}) : ${String(msg).slice(0, 300)}`);
}

async function readSSE(res: Response, onData: (json: any) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        onData(JSON.parse(data));
      } catch {}
    }
  }
}

/** GPT-5.6 Luna through the Responses API (streamed, accumulated). */
export async function analyze(model: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key(), "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: model || ANALYSIS_MODEL,
      instructions: system,
      input: user,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
    }),
  });
  if (!res.ok) await fail(res);
  let out = "";
  let refused = "";
  await readSSE(res, (j) => {
    if (j.type === "response.output_text.delta") out += j.delta ?? "";
    if (j.type === "response.refusal.delta") refused += j.delta ?? "";
    if (j.type === "error") throw new Error(j.message ?? "Erreur IA");
  });
  if (!out && refused) throw new Error("La demande a été refusée par le modèle.");
  return out;
}

/** Cheapest model for producing HTML mockups (chat completions, streamed, accumulated). */
export async function mockup(system: string, user: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MOCKUP_MODEL,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) await fail(res);
  let out = "";
  await readSSE(res, (j) => {
    out += j?.choices?.[0]?.delta?.content ?? "";
  });
  return out;
}

export function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Réponse IA illisible.");
  return JSON.parse(m[0]) as T;
}

export function extractSection(text: string): string {
  let t = text.replace(/^```(?:html)?/im, "").replace(/```\s*$/m, "").trim();
  const s = t.indexOf("<section");
  const e = t.lastIndexOf("</section>");
  if (s >= 0 && e > s) t = t.slice(s, e + 10);
  return t;
}
