import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  app: z.enum(["skyvente", "skyachat"]),
  docLabel: z.string().max(60),
  facts: z.string().max(4000),
  subject: z.string().max(300),
  current: z.string().max(10_000).optional(),
});

const GUIDE: Record<string, string> = {
  skyvente: "Tu écris au nom d'une entreprise à son CLIENT. Devis : ton commercial courtois, invite à valider/signer. Bon de commande : confirme la commande. Facture : rappelle le montant et l'échéance avec tact. Livrable : annonce la livraison et invite à vérifier. Avoir : explique le remboursement/crédit.",
  skyachat: "Tu écris au nom d'une entreprise à son FOURNISSEUR. Demande de prix : demande une offre et des délais. Bon de commande : confirme la commande et la date de livraison attendue. Réception : confirme la réception et signale les remarques. Facture : accuse réception ou signale un écart. Avoir : demande ou confirme l'avoir.",
};

/** Magic wand: writes the e-mail body for a sales/purchase document. */
export const draftDocumentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ text: string | null; error: string | null }> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const { resolveAppAiModel } = await import("@/lib/ai-models.server");
    const model = await resolveAppAiModel(context.supabase, context.userId, "sendy");
    const prompt = `${GUIDE[data.app]}
Rédige en français le corps d'un e-mail professionnel, poli et concis (80 à 160 mots) qui accompagne le document en pièce jointe (PDF).
Type de document : ${data.docLabel}
Objet du mail : ${data.subject}
Informations :
${data.facts}
${data.current ? `Brouillon actuel à améliorer :\n${data.current}\n` : ""}
Règles : texte brut sans markdown, pas d'objet, commence par une formule d'appel, termine par une formule de politesse et la signature de l'entreprise. N'invente aucun chiffre ni date absents des informations. Si un lien de signature est fourni, inclus-le tel quel.`;
    try {
      const res = await generateResponse({
        model: model as "openai/gpt-6-astra",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        reasoning: { effort: "low" },
      });
      let text = "";
      for (const out of res.output ?? []) {
        if (out.type === "message") for (const c of out.content ?? []) if (c.type === "output_text") text += c.text;
      }
      return text.trim() ? { text: text.trim(), error: null } : { text: null, error: "L'IA n'a rien renvoyé, réessayez." };
    } catch (e) {
      console.error("draftDocumentEmail failed", e);
      if (e instanceof GatewayError) {
        if (e.httpStatus === 402) return { text: null, error: "Crédits IA épuisés. Ajoutez des crédits puis réessayez." };
        if (e.httpStatus === 429) return { text: null, error: "Trop de demandes, réessayez dans un instant." };
      }
      return { text: null, error: "La rédaction automatique a échoué." };
    }
  });
