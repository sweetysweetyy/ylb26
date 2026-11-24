// Extraction des données de facture via Lovable AI (Responses API, fetch natif, flux SSE).
import type { ExtractedInvoice } from "./invoice-types";

const nullable = (type: string) => ({ type: [type, "null"] });

const invoiceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["supplier", "invoice_number", "invoice_date", "due_date", "currency", "subtotal", "tax_amount", "total", "payment_reference", "notes", "lines", "confidence"],
  properties: {
    supplier: {
      type: "object",
      additionalProperties: false,
      required: ["name", "vat", "email", "phone", "street", "zip", "city", "country", "website"],
      properties: {
        name: { type: "string" },
        vat: nullable("string"),
        email: nullable("string"),
        phone: nullable("string"),
        street: nullable("string"),
        zip: nullable("string"),
        city: nullable("string"),
        country: nullable("string"),
        website: nullable("string"),
      },
    },
    invoice_number: nullable("string"),
    invoice_date: nullable("string"),
    due_date: nullable("string"),
    currency: nullable("string"),
    subtotal: nullable("number"),
    tax_amount: nullable("number"),
    total: nullable("number"),
    payment_reference: nullable("string"),
    notes: nullable("string"),
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "quantity", "unit_price", "tax_rate", "total"],
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          tax_rate: nullable("number"),
          total: nullable("number"),
        },
      },
    },
    confidence: { type: "number" },
  },
};

const PROMPT = `Tu es un expert-comptable. Analyse cette facture d'achat (facture fournisseur) et extrais toutes les informations nécessaires pour la recréer dans Odoo.
Règles :
- Le "supplier" est l'émetteur de la facture (le vendeur), jamais le destinataire.
- Dates au format YYYY-MM-DD. Devise en code ISO (EUR, USD...).
- Montants en nombres décimaux (point décimal), hors devise. subtotal = total HT, tax_amount = total des taxes, total = TTC.
- Chaque ligne : quantity (1 si absente), unit_price HT, tax_rate en pourcentage (ex: 20 pour 20 %), total HT de la ligne.
- Si une information est absente, mets null. N'invente rien.
- confidence : ta confiance globale entre 0 et 1.
Réponds uniquement en JSON conforme au schéma.`;

export class AiGatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function extractInvoiceFromPdf(pdfBase64: string, filename: string, model = "openai/gpt-6-astra"): Promise<ExtractedInvoice> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquant");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_file", filename, file_data: `data:application/pdf;base64,${pdfBase64}` },
            { type: "input_text", text: PROMPT },
          ],
        },
      ],
      text: { format: { type: "json_schema", name: "invoice_extraction", strict: true, schema: invoiceSchema } },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = "L'analyse IA a échoué.";
    try {
      msg = (JSON.parse(body) as { message?: string; error?: { message?: string } }).message ?? JSON.parse(body).error?.message ?? msg;
    } catch { /* ignore */ }
    if (res.status === 402) msg = "Crédits Lovable AI insuffisants. Rechargez votre espace de travail pour continuer.";
    if (res.status === 429) msg = "Trop de demandes simultanées. Réessayez dans quelques instants.";
    throw new AiGatewayError(res.status, msg);
  }

  // Lecture du flux SSE : on accumule output_text.delta
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const raw = dataLine.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      let payload: { type?: string; delta?: string; response?: { output_text?: string }; error?: { message?: string } };
      try { payload = JSON.parse(raw); } catch { continue; }
      if (payload.type === "response.output_text.delta" && payload.delta) text += payload.delta;
      else if (payload.type === "response.completed") { done = true; if (!text && payload.response?.output_text) text = payload.response.output_text; }
      else if (payload.type === "response.failed" || payload.type === "error") {
        throw new AiGatewayError(500, payload.error?.message ?? "L'analyse IA a échoué.");
      }
    }
  }

  if (!text.trim()) throw new AiGatewayError(500, "L'IA n'a renvoyé aucune donnée exploitable pour ce PDF.");
  const parsed = JSON.parse(text) as ExtractedInvoice;
  parsed.lines = Array.isArray(parsed.lines) ? parsed.lines : [];
  return parsed;
}
