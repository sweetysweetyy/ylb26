import { publishPostCore, logStep } from "@/cml/lib/linkedin.server";

export type Job = {
  id: string;
  user_id: string;
  post_id: string;
  attempts: number;
  max_attempts: number;
  status: string;
};

/** Verrouille et retourne le prochain job dû pour un utilisateur (ou tous si userId null). */
export async function pickNextJob(supabase: any, userId?: string | null): Promise<Job | null> {
  let q = supabase
    .from("cml_publish_jobs")
    .select("*")
    .in("status", ["queued", "retry"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(1);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  const job = data?.[0];
  if (!job) return null;

  const { data: locked } = await supabase
    .from("cml_publish_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", job.id)
    .in("status", ["queued", "retry"])
    .select()
    .maybeSingle();
  return locked ?? null;
}

const BACKOFF_MIN = [1, 5, 15, 60];

/** Exécute un job avec gestion des tentatives et backoff exponentiel. */
export async function runJob(supabase: any, job: Job) {
  const attempts = job.attempts + 1;
  try {
    const res = await publishPostCore(supabase, job.user_id, job.post_id, job.id);
    const { data } = await supabase.from("cml_publish_jobs").update({
      status: "success",
      attempts,
      finished_at: new Date().toISOString(),
      result: res,
      last_error: null,
    }).eq("id", job.id).select().maybeSingle();
    return data;
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 1000);
    const exhausted = attempts >= (job.max_attempts ?? 3);
    const delay = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
    const { data } = await supabase.from("cml_publish_jobs").update({
      status: exhausted ? "failed" : "retry",
      attempts,
      last_error: msg,
      next_attempt_at: new Date(Date.now() + delay * 60000).toISOString(),
      finished_at: exhausted ? new Date().toISOString() : null,
    }).eq("id", job.id).select().maybeSingle();

    await supabase.from("cml_posts").update({ publish_attempts: attempts, last_publish_error: msg }).eq("id", job.post_id);
    await logStep(supabase, {
      user_id: job.user_id, post_id: job.post_id, job_id: job.id, level: "error", step: "job",
      message: exhausted ? `Échec définitif (${attempts} tentatives): ${msg}` : `Tentative ${attempts} échouée, nouvel essai dans ${delay} min: ${msg}`,
    });
    if (exhausted) {
      await supabase.from("cml_notifications").insert({
        user_id: job.user_id,
        kind: "publish_failed",
        title: "Échec de publication LinkedIn",
        body: msg.slice(0, 140),
        meta: { post_id: job.post_id, job_id: job.id },
      });
    }
    return data;
  }
}

/** Boucle de traitement (cron) : jobs dus + posts planifiés arrivés à échéance. */
export async function processDue(supabase: any, limit = 10) {
  // 1) Enfile les posts planifiés dus si auto-publication activée
  const { data: due } = await supabase
    .from("cml_posts")
    .select("id, user_id, scheduled_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  for (const p of due ?? []) {
    const { data: s } = await supabase.from("cml_settings").select("auto_publish").eq("user_id", p.user_id).maybeSingle();
    if (!s?.auto_publish) continue;
    const { data: existing } = await supabase
      .from("cml_publish_jobs").select("id").eq("post_id", p.id).in("status", ["queued", "retry", "processing", "success"]).limit(1);
    if (existing?.length) continue;
    await supabase.from("cml_publish_jobs").insert({
      user_id: p.user_id, post_id: p.id, status: "queued",
      scheduled_for: p.scheduled_at, next_attempt_at: new Date().toISOString(),
    });
  }

  // 2) Traite les jobs dus
  const processed: any[] = [];
  for (let i = 0; i < limit; i++) {
    const job = await pickNextJob(supabase, null);
    if (!job) break;
    processed.push(await runJob(supabase, job));
  }
  return { enqueued: due?.length ?? 0, processed: processed.length };
}
