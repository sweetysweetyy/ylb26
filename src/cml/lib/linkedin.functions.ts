import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============ CONNECT (fetch profile) ============ */
export const connectLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { li } = await import("@/cml/lib/linkedin.server");
    const info = await li("/v2/userinfo", { method: "GET" });
    const urn = `urn:li:person:${info.sub}`;
    await context.supabase.from("cml_settings").update({
      linkedin_connected: true,
      linkedin_profile: {
        sub: info.sub,
        urn,
        name: info.name,
        given_name: info.given_name,
        family_name: info.family_name,
        email: info.email,
        picture: info.picture,
        linked_at: new Date().toISOString(),
      },
    }).eq("user_id", context.userId);
    return { ok: true, profile: info, urn };
  });

/* ============ PUBLISH (immédiat, texte + image) ============ */
export const publishToLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { publishPostCore, logStep } = await import("@/cml/lib/linkedin.server");
    try {
      return await publishPostCore(context.supabase, context.userId, data.postId);
    } catch (e: any) {
      await context.supabase.from("cml_posts")
        .update({ last_publish_error: String(e?.message ?? e).slice(0, 800) })
        .eq("id", data.postId);
      await logStep(context.supabase, {
        user_id: context.userId, post_id: data.postId, level: "error", step: "publish",
        message: String(e?.message ?? e),
      });
      throw e;
    }
  });

/* ============ FILE DE PUBLICATION (batch) ============ */
export const enqueuePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      postIds: z.array(z.string().uuid()).min(1).max(50),
      scheduledFor: z.string().optional(),
      spacingMinutes: z.number().min(0).max(720).default(0),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const base = data.scheduledFor ? new Date(data.scheduledFor) : new Date();
    const rows = data.postIds.map((id, i) => {
      const when = new Date(base.getTime() + i * data.spacingMinutes * 60000).toISOString();
      return {
        user_id: context.userId,
        post_id: id,
        status: "queued",
        scheduled_for: when,
        next_attempt_at: when,
      };
    });
    const { data: jobs, error } = await context.supabase.from("cml_publish_jobs").insert(rows).select();
    if (error) throw new Error(error.message);
    return { queued: jobs?.length ?? 0, jobs };
  });

/** Traite la file côté client (progression en direct) : 1 job à la fois. */
export const processNextJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runJob, pickNextJob } = await import("@/cml/lib/linkedin-queue.server");
    const job = await pickNextJob(context.supabase, context.userId);
    if (!job) return { done: true as const };
    const result = await runJob(context.supabase, job);
    return { done: false as const, job: result };
  });

export const retryJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cml_publish_jobs").update({
      status: "queued", last_error: null, next_attempt_at: new Date().toISOString(),
      max_attempts: 3, attempts: 0, finished_at: null,
    }).eq("id", data.jobId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cml_publish_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", data.jobId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ ANALYTICS ============ */
export const fetchLinkedInAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { fetchPostMetrics } = await import("@/cml/lib/linkedin.server");
    const { data: post } = await context.supabase.from("cml_posts").select("*")
      .eq("id", data.postId).eq("user_id", context.userId).maybeSingle();
    if (!post?.linkedin_urn) throw new Error("Post non publié");
    return await fetchPostMetrics(context.supabase, context.userId, post);
  });

export const refreshAllAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { fetchPostMetrics } = await import("@/cml/lib/linkedin.server");
    const { data: posts } = await context.supabase.from("cml_posts")
      .select("id, linkedin_urn, published_at")
      .eq("user_id", context.userId).eq("status", "published")
      .not("linkedin_urn", "is", null).limit(50);
    let done = 0;
    for (const p of posts ?? []) {
      try { await fetchPostMetrics(context.supabase, context.userId, p); done++; } catch { /* ignore */ }
    }
    return { updated: done };
  });

/* ============ OPTIMISEUR D'HORAIRES ============ */
export const computeBestSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeSlots } = await import("@/cml/lib/linkedin-slots.server");
    return await computeSlots(context.supabase, context.userId);
  });

/* ============ COMMENTAIRES : IMPORT + BROUILLONS IA ============ */
export const syncComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncCommentsCore } = await import("@/cml/lib/linkedin-comments.server");
    return await syncCommentsCore(context.supabase, context.userId);
  });

export const draftCommentReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { draftRepliesCore } = await import("@/cml/lib/linkedin-comments.server");
    return await draftRepliesCore(context.supabase, context.userId, data.ids);
  });

export const sendCommentReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), text: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { sendReplyCore } = await import("@/cml/lib/linkedin-comments.server");
    return await sendReplyCore(context.supabase, context.userId, data.id, data.text);
  });
