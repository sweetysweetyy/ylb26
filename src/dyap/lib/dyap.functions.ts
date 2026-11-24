import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type AnalyzeInput = { csvData: string; fileName: string; analysisLevel?: string; tone?: string; language?: string };
type UpdateInput = { presentationId: string; message: string; conversationHistory?: Msg[] };
import { dyapAnalyzeCore, dyapUpdateCore } from "./dyap-workflow.server";

export const dyapAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AnalyzeInput) => ({ ...d, csvData: String(d.csvData || "").slice(0, 15000), fileName: String(d.fileName || "fichier") }))
  .handler(dyapAnalyzeCore);

export const dyapUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateInput) => d)
  .handler(dyapUpdateCore);
