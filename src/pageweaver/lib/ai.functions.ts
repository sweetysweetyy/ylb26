import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const designSchema = z.object({
  palette: z.record(z.string(), z.string()).optional(),
  fonts: z.object({ heading: z.string(), body: z.string() }).partial().optional(),
  tone: z.string().optional(),
  style: z.string().optional(),
}).passthrough();

export type Design = {
  palette?: Record<string, string>;
  fonts?: { heading?: string; body?: string };
  tone?: string;
  style?: string;
};

export type SuggestedSection = { title: string; description: string };

const sectionInput = z.object({
  brief: z.string().max(6000),
  design: z.any(),
  title: z.string().max(200),
  description: z.string().max(6000),
  config: z.record(z.string(), z.any()),
  neighbors: z.array(z.string()).max(20).optional(),
});

const regenInput = z.object({
  design: z.any(),
  title: z.string().max(200),
  html: z.string().max(60000),
  request: z.string().max(4000),
  annotations: z
    .array(z.object({ kind: z.string(), note: z.string().max(1000), position: z.string(), target: z.string().max(600) }))
    .max(40),
});

import { analyzeBriefCore, generateSectionCore, regenerateSectionCore } from "./ai-workflow.server";

export const analyzeBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brief: string }) => z.object({ brief: z.string().min(3).max(6000) }).parse(d))
  .handler(analyzeBriefCore);

export const generateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof sectionInput>) => sectionInput.parse(d))
  .handler(generateSectionCore);

export const regenerateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof regenInput>) => regenInput.parse(d))
  .handler(regenerateSectionCore);
