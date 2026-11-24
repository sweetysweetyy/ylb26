import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Import one CV file (PDF/DOCX/TXT) encoded in base64; extracts everything and builds the profile. */
export const importCvFileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    fileName: z.string().min(1).max(300),
    base64: z.string().min(10),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { extractDocumentText, analyzeCvAndInsert, rankMatchesForCandidate } = await import("@/feeloo/lib/hr-core.server");
    const bin = atob(data.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = await extractDocumentText(bytes, data.fileName);
    if (text.trim().length < 60) {
      throw new Error(`Impossible d'extraire du texte de « ${data.fileName} » (fichier scanné ou protégé ?).`);
    }
    const cand = await analyzeCvAndInsert(supabase, userId, text, {
      source: "upload", sourceRef: data.fileName, fileName: data.fileName,
    });
    const matched = await rankMatchesForCandidate(supabase, userId, cand);
    return { id: cand.id, full_name: cand.full_name, matched, chars: text.length };
  });
