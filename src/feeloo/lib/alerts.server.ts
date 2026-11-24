/** Proactive alert engine (server-only): high-score matches on priority jobs + duplicate radar. */
import type { AnyClient } from "./hr-core.server";

export async function raiseHighScoreAlerts(supabase: AnyClient, userId: string) {
  const { data: settings } = await supabase
    .from("fl_settings").select("alert_score_threshold, auto_alerts_enabled").eq("user_id", userId).maybeSingle();
  if (settings?.auto_alerts_enabled === false) return 0;
  const threshold = Number(settings?.alert_score_threshold ?? 85);

  const { data: rows } = await supabase
    .from("fl_candidate_job_matches")
    .select("id, score, candidate_id, job_id")
    .eq("user_id", userId)
    .gte("score", threshold)
    .order("score", { ascending: false })
    .limit(40);
  if (!rows?.length) return 0;

  const jobIds = [...new Set(rows.map((r: any) => r.job_id))];
  const candIds = [...new Set(rows.map((r: any) => r.candidate_id))];
  const [{ data: jobs }, { data: cands }] = await Promise.all([
    supabase.from("fl_jobs").select("id, title, priority, status, accepts_applications").in("id", jobIds),
    supabase.from("fl_candidates").select("id, full_name, available").in("id", candIds),
  ]);
  const jobById = Object.fromEntries((jobs ?? []).map((j: any) => [j.id, j]));
  const candById = Object.fromEntries((cands ?? []).map((c: any) => [c.id, c]));

  let created = 0;
  for (const r of rows) {
    const job = jobById[r.job_id];
    const cand = candById[r.candidate_id];
    if (!job || !cand) continue;
    if (job.status !== "open" || job.accepts_applications === false) continue;
    if (cand.available === false) continue;
    if (Number(job.priority ?? 0) < 60) continue; // priority jobs only
    const { error } = await supabase.from("fl_notifications").insert({
      user_id: userId,
      kind: "high_score_match",
      severity: "high",
      title: `${cand.full_name} — ${Math.round(Number(r.score))}% sur « ${job.title} »`,
      body: `Nouveau profil au-dessus de ${threshold}% sur un poste prioritaire. À contacter en priorité.`,
      link: `/jobs/${job.id}`,
      metadata: { candidate_id: r.candidate_id, job_id: r.job_id, score: r.score },
      dedupe_key: `hsm:${r.candidate_id}:${r.job_id}`,
    });
    if (!error) created++;
  }
  return created;
}

/** Heuristic duplicate detection over the CV library. Stores confirmed pairs. */
export async function detectDuplicates(supabase: AnyClient, userId: string) {
  const { data: cands } = await supabase
    .from("fl_candidates")
    .select("id, full_name, email, phone, skills, years_experience, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(400);
  const list = cands ?? [];
  const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9@.]/g, "");
  const pairs: Array<{ a: any; b: any; similarity: number; reasons: string[] }> = [];

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const reasons: string[] = [];
      let score = 0;
      if (a.email && b.email && norm(a.email) === norm(b.email)) { score += 60; reasons.push("Email identique"); }
      if (a.phone && b.phone && norm(a.phone).slice(-9) === norm(b.phone).slice(-9) && norm(a.phone).length >= 9) { score += 30; reasons.push("Téléphone identique"); }
      if (norm(a.full_name) && norm(a.full_name) === norm(b.full_name)) { score += 40; reasons.push("Nom identique"); }
      const sa = new Set((a.skills ?? []).map((s: string) => norm(s)));
      const sb = new Set((b.skills ?? []).map((s: string) => norm(s)));
      if (sa.size && sb.size) {
        const inter = [...sa].filter((s) => sb.has(s as string)).length;
        const overlap = inter / Math.min(sa.size, sb.size);
        if (overlap > 0.75) { score += 20; reasons.push(`Compétences ${Math.round(overlap * 100)}% communes`); }
      }
      if (score >= 55) pairs.push({ a, b, similarity: Math.min(100, score), reasons });
    }
  }

  for (const p of pairs) {
    await supabase.from("fl_candidate_duplicates").upsert({
      user_id: userId,
      candidate_id: p.b.id,
      duplicate_of: p.a.id,
      similarity: p.similarity,
      reasons: p.reasons,
    }, { onConflict: "user_id,candidate_id,duplicate_of" });
    await supabase.from("fl_notifications").insert({
      user_id: userId, kind: "duplicate", severity: "medium",
      title: `Doublon probable : ${p.b.full_name}`,
      body: `${p.reasons.join(" · ")} (similarité ${p.similarity}%)`,
      link: `/talent`,
      metadata: { candidate_id: p.b.id, duplicate_of: p.a.id },
      dedupe_key: `dup:${p.a.id}:${p.b.id}`,
    });
  }
  return pairs.length;
}
