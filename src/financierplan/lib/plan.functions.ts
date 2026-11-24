import { createServerFn } from "@tanstack/react-start";
import { fp } from "@/financierplan/lib/db";
import { resolveAppAiModel } from "@/lib/ai-models.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/financierplan/types";
import { z } from "zod";
import { aiComplete, extractJson } from "./ai.server";
import {
  buildChatPrompt,
  buildRefinePrompt,
  buildSectionPrompt,
  SYSTEM_ANALYST,
  type ProjectCtx,
} from "./prompts.server";
import { DEFAULT_MODEL, SECTION_MAP, SECTIONS, type SectionContent } from "./sections";

const CreateProject = z.object({
  name: z.string().min(2).max(120),
  idea: z.string().min(20).max(8000),
  sector: z.string().max(120).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  legal_form: z.string().max(60).optional().nullable(),
  starting_capital: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(8).default("EUR"),
});

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateProject.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await fp(context.supabase)
      .from("fp_projects")
      .insert({
        name: data.name,
        idea: data.idea,
        sector: data.sector ?? null,
        location: data.location ?? null,
        legal_form: data.legal_form ?? null,
        starting_capital: data.starting_capital ?? null,
        currency: data.currency,
        user_id: context.userId,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const generateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sectionKey: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const def = SECTION_MAP[data.sectionKey as keyof typeof SECTION_MAP];
    if (!def) throw new Error("Section inconnue");

    const { data: project, error: pErr } = await fp(context.supabase)
      .from("fp_projects")
      .select("*")
      .eq("id", data.projectId)
      .single();
    if (pErr || !project) throw new Error("Projet introuvable");

    const { data: settings } = await fp(context.supabase)
      .from("fp_settings")
      .select("ai_model, tax_rate")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: done } = await fp(context.supabase)
      .from("fp_plan_sections")
      .select("section_key, content")
      .eq("project_id", data.projectId)
      .eq("status", "ready");

    const ordered = (done ?? [])
      .map((s) => ({
        section_key: s.section_key as string,
        content: (s.content ?? {}) as SectionContent,
        index: SECTION_MAP[s.section_key as keyof typeof SECTION_MAP]?.index ?? 99,
      }))
      .filter((s) => s.index < def.index)
      .sort((a, b) => a.index - b.index);

    const prompt = buildSectionPrompt(
      def,
      project as unknown as ProjectCtx,
      ordered,
      Number(settings?.tax_rate ?? 25),
    );
    const raw = await aiComplete(await resolveAppAiModel(context.supabase, context.userId, "financierplan", settings?.ai_model ?? DEFAULT_MODEL), SYSTEM_ANALYST, prompt);
    const content = extractJson<SectionContent>(raw);

    const { error } = await fp(context.supabase).from("fp_plan_sections").upsert(
      {
        project_id: data.projectId,
        user_id: context.userId,
        section_key: def.key,
        title: def.title,
        content: content as unknown as Json,
        status: "ready",
      },
      { onConflict: "project_id,section_key" },
    );
    if (error) throw new Error(error.message);

    const { count } = await fp(context.supabase)
      .from("fp_plan_sections")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId)
      .eq("status", "ready");

    const progress = Math.round(((count ?? 0) / SECTIONS.length) * 100);
    await fp(context.supabase)
      .from("fp_projects")
      .update({ progress, status: progress >= 100 ? "complete" : "generating" })
      .eq("id", data.projectId);

    return { sectionKey: def.key, content, progress };
  });

export const refineSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        sectionKey: z.string(),
        instruction: z.string().min(3).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const def = SECTION_MAP[data.sectionKey as keyof typeof SECTION_MAP];
    if (!def) throw new Error("Section inconnue");

    const [{ data: project }, { data: settings }, { data: current }] = await Promise.all([
      fp(context.supabase).from("fp_projects").select("*").eq("id", data.projectId).single(),
      fp(context.supabase)
        .from("fp_settings")
        .select("ai_model")
        .eq("user_id", context.userId)
        .maybeSingle(),
      fp(context.supabase)
        .from("fp_plan_sections")
        .select("content, version")
        .eq("project_id", data.projectId)
        .eq("section_key", def.key)
        .maybeSingle(),
    ]);
    if (!project) throw new Error("Projet introuvable");

    const prompt = buildRefinePrompt(
      def,
      project as unknown as ProjectCtx,
      (current?.content ?? {}) as SectionContent,
      data.instruction,
    );
    const raw = await aiComplete(await resolveAppAiModel(context.supabase, context.userId, "financierplan", settings?.ai_model ?? DEFAULT_MODEL), SYSTEM_ANALYST, prompt);
    const content = extractJson<SectionContent>(raw);

    const { error } = await fp(context.supabase).from("fp_plan_sections").upsert(
      {
        project_id: data.projectId,
        user_id: context.userId,
        section_key: def.key,
        title: def.title,
        content: content as unknown as Json,
        status: "ready",
        version: (current?.version ?? 1) + 1,
      },
      { onConflict: "project_id,section_key" },
    );
    if (error) throw new Error(error.message);
    return { sectionKey: def.key, content };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        message: z.string().min(1).max(4000),
        sectionKey: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ data: project }, { data: settings }, { data: sections }, { data: history }] =
      await Promise.all([
        fp(context.supabase).from("fp_projects").select("*").eq("id", data.projectId).single(),
        fp(context.supabase)
          .from("fp_settings")
          .select("ai_model")
          .eq("user_id", context.userId)
          .maybeSingle(),
        fp(context.supabase)
          .from("fp_plan_sections")
          .select("section_key, content")
          .eq("project_id", data.projectId)
          .eq("status", "ready"),
        fp(context.supabase)
          .from("fp_chat_messages")
          .select("role, content")
          .eq("project_id", data.projectId)
          .order("created_at", { ascending: true })
          .limit(30),
      ]);
    if (!project) throw new Error("Projet introuvable");

    await fp(context.supabase).from("fp_chat_messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "user",
      content: data.message,
      section_key: data.sectionKey ?? null,
    });

    const prompt = buildChatPrompt(
      project as unknown as ProjectCtx,
      (sections ?? []).map((s) => ({
        section_key: s.section_key as string,
        content: (s.content ?? {}) as SectionContent,
      })),
      (history ?? []) as { role: string; content: string }[],
      data.sectionKey
        ? `[Section en cours de consultation : ${data.sectionKey}] ${data.message}`
        : data.message,
    );

    const raw = await aiComplete(await resolveAppAiModel(context.supabase, context.userId, "financierplan", settings?.ai_model ?? DEFAULT_MODEL), SYSTEM_ANALYST, prompt);
    const parsed = extractJson<{
      reply: string;
      target_section: string | null;
      suggested_instruction: string | null;
    }>(raw);

    await fp(context.supabase).from("fp_chat_messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "assistant",
      content: parsed.reply,
      section_key: parsed.target_section ?? null,
    });

    return parsed;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ai_model: z.string().min(3).max(80),
        currency: z.string().min(1).max(8),
        tax_rate: z.number().min(0).max(60),
        language: z.string().min(2).max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await fp(context.supabase)
      .from("fp_settings")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
