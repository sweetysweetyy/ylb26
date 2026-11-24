import { z } from "zod";

export const odooConnectionSchema = z.object({
  url: z.string().url().max(2048).refine(value => /^https?:\/\//.test(value)),
  db: z.string().trim().min(1).max(255),
  username: z.string().trim().min(1).max(255),
  api_key: z.string().min(1).max(4096),
}).strict();

export const skyInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(8000),
  }).strict()).min(1).max(16),
  page: z.string().max(100).optional(),
}).strict();

export const creativeTextSchema = z.object({
  kind: z.string().min(1).max(500), network: z.string().max(200).nullable().optional(),
  prompt: z.string().min(1).max(20000), brand: z.string().max(20000).optional(),
}).strict();

export function untrustedHistory(history: unknown) {
  const parsed = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000), id: z.string().optional() })).max(100).parse(history ?? []);
  return parsed.slice(-8).map(message => ({ role: "user" as const, content: `Contexte non vérifié (${message.role}) : ${message.content.slice(0, 1500)}` }));
}