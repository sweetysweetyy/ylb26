import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const KBSchema = z.object({
  company_description: z.string().default(""),
  services: z.string().default(""),
  value_proposition: z.string().default(""),
  target_clients: z.string().default(""),
  pricing_notes: z.string().default(""),
  case_studies: z.string().default(""),
  values: z.string().default(""),
  faq: z.string().default(""),
  objections_handling: z.string().default(""),
  meeting_proposal: z.string().default(""),
});

export const getKnowledgeBase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const existing = await context.supabase.from("psc_knowledge_base").select("*").eq("user_id", context.userId).maybeSingle();
    if (existing.data) return existing.data;
    const insert = await context.supabase.from("psc_knowledge_base").insert({ user_id: context.userId }).select().single();
    return insert.data;
  });

export const updateKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KBSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("psc_knowledge_base").upsert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ company_name: z.string().optional(), full_name: z.string().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    return data;
  });