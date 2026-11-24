import { z } from "zod";

// Required, nullable properties: strict Responses schemas have no optional/default keys.
export const ecosystemSchema = z.object({
  summary: z.string(),
  assignments: z.array(z.object({
    node_ref: z.string(), app_key: z.string().nullable(), reason: z.string(), gain: z.string(),
    requires: z.array(z.enum(["odoo", "google"])),
    effort: z.enum(["faible", "moyen", "élevé"]), impact: z.enum(["faible", "moyen", "fort"]),
    mission: z.string(), as_is_refs: z.array(z.string()), comparison_reason: z.string(),
    new_app: z.object({ name: z.string(), mission: z.string(), inputs: z.array(z.string()), outputs: z.array(z.string()), prefix: z.string(), tables: z.array(z.string()), routes: z.array(z.string()), ai: z.string(), gain: z.string(), prompt: z.string() }).nullable(),
  })),
  flows: z.array(z.object({ from: z.string(), to: z.string(), data: z.string() })),
  phases: z.array(z.object({ title: z.string(), app_keys: z.array(z.string()) })),
});
const evidenceSchema = z.object({ kind: z.enum(["declared", "estimated"]), quote: z.string(), reason: z.string() });
export const refinementSchema = z.object({
  reply: z.string(),
  ecosystem: ecosystemSchema,
  metric_updates: z.array(z.object({ ref: z.string(), field: z.enum(["cycle_time_minutes", "wait_time_minutes", "hourly_cost"]), value: z.number(), evidence: evidenceSchema })),
  parameter_updates: z.array(z.object({ field: z.enum(["annual_volume", "rework_rate_percent", "monthly_licences_before", "monthly_licences_after", "revenue_per_freed_hour", "latency_cost_per_hour", "implementation_cost"]), value: z.number(), evidence: evidenceSchema })),
});