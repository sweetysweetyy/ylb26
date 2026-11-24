import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CompanyInput = z.object({
  company: z.string().min(2),
  offerId: z.string().uuid().optional(),
  context: z.string().optional(),
});

export const researchCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompanyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { researchCompany } = await import("@/nexusjob/lib/company.server");
    const report = await researchCompany(context.supabase, context.userId, data);
    return { report };
  });
