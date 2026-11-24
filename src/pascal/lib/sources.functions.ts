import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("psc_sheet_sources").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

const SourceInput = z.object({
  spreadsheet_id: z.string().min(10),
  sheet_name: z.string().min(1),
  display_name: z.string().optional(),
  email_column: z.string().min(1),
  name_column: z.string().optional(),
  company_column: z.string().optional(),
  context_column: z.string().optional(),
});

export const createSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SourceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("psc_sheet_sources")
      .insert({ user_id: context.userId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("psc_sheet_sources").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const scanNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scanSheetForNewProspects, runAgentForNewProspects, pollAndRespondReplies } = await import("./pascal-engine.server");
    const scan = await scanSheetForNewProspects(context.userId);
    const run = await runAgentForNewProspects(context.userId);
    const poll = await pollAndRespondReplies(context.userId);
    return { added: scan.added, sent: run.sent, replies: poll.processed };
  });