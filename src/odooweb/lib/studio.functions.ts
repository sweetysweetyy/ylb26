import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { connectOdooCore, generatePlanCore, publishSiteCore } from "./studio-workflow.server";

export const connectOdoo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; url: string; db: string; login: string; apiKey: string }) => input)
  .handler(connectOdooCore);

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(generatePlanCore);

export const publishSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(publishSiteCore);
