import { z } from "zod";

const text = z.string().max(20000).nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: text.optional(), notes: text.optional(),
  status: z.enum(["a_faire", "en_cours", "en_revue", "termine", "bloque"]).optional(),
  priority: z.enum(["basse", "moyenne", "haute", "critique"]).optional(),
  start_date: date.optional(), due_date: date.optional(),
  color: z.string().max(50).nullable().optional(), icon: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
  estimated_hours: z.number().finite().nonnegative().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  dependency_ids: z.array(z.string().uuid()).max(100).optional(),
}).strict();

export const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  description: text.optional(), objective: text.optional(),
  start_date: date.optional(), end_date: date.optional(),
  budget: z.number().finite().nonnegative().nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  phase: z.enum(["lancement", "planification", "execution", "cloture"]).optional(),
  status: z.enum(["actif", "en_pause", "termine", "archive"]).optional(),
}).strict();