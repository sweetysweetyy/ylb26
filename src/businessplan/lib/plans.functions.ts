import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAnalysis, runRefine } from "./plans.server";

export const analyzePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ planId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => runAnalysis(context.supabase, context.userId, data.planId));

export const refineSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        planId: z.string().uuid(),
        sectionId: z.string().min(1),
        instruction: z.string().min(3).max(600),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    runRefine(context.supabase, context.userId, data.planId, data.sectionId, data.instruction),
  );
