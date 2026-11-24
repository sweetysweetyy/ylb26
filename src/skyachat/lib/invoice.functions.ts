import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  fileBase64: z.string().min(10).max(28_000_000),
  mimeType: z.string().max(100),
  filename: z.string().max(255),
});

export type ExtractedInvoice = {
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  supplier: {
    company: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    siret: string;
    vat_number: string;
  };
  items: { reference: string; name: string; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number }[];
  shipping: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  payment_terms: string;
  notes: string;
};

const PROMPT = `Tu es un expert-comptable. Analyse cette facture fournisseur et extrais TOUTES les données.
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown) de la forme :
{"invoice_number":"","issue_date":"YYYY-MM-DD ou null","due_date":"YYYY-MM-DD ou null","currency":"EUR",
"supplier":{"company":"","address":"","zip":"","city":"","country":"","email":"","phone":"","siret":"","vat_number":""},
"items":[{"reference":"","name":"","description":"","quantity":1,"unit":"u","unit_price":0,"vat_rate":20}],
"shipping":0,"total_ht":0,"total_vat":0,"total_ttc":0,"payment_terms":"","notes":""}
Les prix unitaires sont HT. Les nombres sont des nombres JSON (point décimal). Champ inconnu = "" ou 0.`;

export const extractInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ invoice: ExtractedInvoice | null; error: string | null }> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "skyachat");
    const dataUrl = `data:${data.mimeType};base64,${data.fileBase64}`;
    const filePart = data.mimeType.startsWith("image/")
      ? ({ type: "input_image", image_url: dataUrl, detail: "high" } as const)
      : ({ type: "input_file", file_data: dataUrl, filename: data.filename } as const);
    try {
      const res = await generateResponse({
        model: model as "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: PROMPT }, filePart],
          },
        ],
        text: { format: { type: "json_object" } },
      });
      let text = "";
      for (const out of res.output ?? []) {
        if (out.type === "message") {
          for (const c of out.content ?? []) if (c.type === "output_text") text += c.text;
        }
      }
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const invoice = JSON.parse(cleaned) as ExtractedInvoice;
      return { invoice, error: null };
    } catch (e) {
      console.error("extractInvoice failed", e);
      if (e instanceof GatewayError) {
        if (e.httpStatus === 402) return { invoice: null, error: "Crédits IA épuisés. Ajoutez des crédits puis réessayez." };
        if (e.httpStatus === 429) return { invoice: null, error: "Trop de demandes, réessayez dans un instant." };
      }
      return { invoice: null, error: "La lecture automatique de la facture a échoué. Vous pouvez la saisir manuellement." };
    }
  });
