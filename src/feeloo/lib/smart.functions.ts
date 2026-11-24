import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** SMART: shortlist IA d'un poste, avec plan d'entretien et ordre de contact. */
export const smartShortlistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid(), size: z.number().int().min(1).max(10).default(5) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const { data: job } = await supabase.from("fl_jobs").select("*").eq("id", data.jobId).eq("user_id", userId).single();
    const { data: matches } = await supabase.from("fl_candidate_job_matches")
      .select("*, candidates(*)").eq("user_id", userId).eq("job_id", data.jobId)
      .order("score", { ascending: false }).limit(25);
    const pool = (matches ?? []).filter((m: any) => m.candidates?.available !== false).slice(0, 12);
    if (!pool.length) return { shortlist: [], strategy: "Aucun candidat disponible pour ce poste." };
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: `Tu es un directeur du recrutement. À partir du poste et des candidats scorés, construis une shortlist de ${data.size} personnes maximum. JSON strict: {shortlist:[{candidate_id,full_name,rank,score,why,risks[],interview_focus[],suggested_first_message}],strategy,timeline}` },
      { role: "user", content: `POSTE: ${JSON.stringify({ title: job?.title, seniority: job?.seniority, required_skills: job?.required_skills, description: job?.description })}\n\nCANDIDATS:\n${JSON.stringify(pool.map((m: any) => ({ candidate_id: m.candidate_id, full_name: m.candidates?.full_name, score: m.score, strengths: m.strengths, gaps: m.gaps, headline: m.candidates?.headline, skills: m.candidates?.skills, years: m.candidates?.years_experience })))}` },
    ], { json: true });
    return safeJson(raw, { shortlist: [], strategy: "Analyse indisponible." });
  });

/** SMART: radar du vivier — pénuries de compétences, opportunités, actions prioritaires. */
export const smartTalentRadarFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const [{ data: cands }, { data: jobs }, { data: matches }] = await Promise.all([
      supabase.from("fl_candidates").select("full_name, headline, skills, seniority, years_experience, status, available").eq("user_id", userId).limit(120),
      supabase.from("fl_jobs").select("title, seniority, required_skills, status, accepts_applications").eq("user_id", userId).limit(60),
      supabase.from("fl_candidate_job_matches").select("score").eq("user_id", userId).limit(500),
    ]);
    if (!(cands ?? []).length && !(jobs ?? []).length) {
      return { headline: "Vivier vide", insights: [], skill_gaps: [], actions: [], risks: [] };
    }
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: "Tu es un stratège talent acquisition. Analyse le vivier et les postes. JSON strict: {headline, health_score(0-100), insights:[{title,detail,impact}], skill_gaps:[{skill,demand,supply,severity}], actions:[{action,priority,expected_impact}], risks:[string], sourcing_ideas:[string]}" },
      { role: "user", content: `CANDIDATS(${cands?.length}): ${JSON.stringify(cands)}\n\nPOSTES(${jobs?.length}): ${JSON.stringify(jobs)}\n\nSCORES: ${JSON.stringify((matches ?? []).map((m: any) => m.score))}` },
    ], { json: true });
    return safeJson(raw, { headline: "Analyse indisponible", insights: [], skill_gaps: [], actions: [], risks: [] });
  });

/** SMART: génère un email d'approche personnalisé pour un candidat (et un poste optionnel). */
export const smartOutreachFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    tone: z.enum(["direct", "chaleureux", "executive"]).default("chaleureux"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const { data: cand } = await supabase.from("fl_candidates").select("*").eq("id", data.candidateId).eq("user_id", userId).single();
    const job = data.jobId
      ? (await supabase.from("fl_jobs").select("*").eq("id", data.jobId).eq("user_id", userId).single()).data
      : null;
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: `Rédige une approche de recrutement en français, ton ${data.tone}. JSON strict: {subject, email, linkedin_message, call_script_bullets[]}` },
      { role: "user", content: `CANDIDAT: ${JSON.stringify({ name: cand?.full_name, headline: cand?.headline, skills: cand?.skills, experiences: (cand?.experiences as any)?.slice?.(0, 3) })}\n\nPOSTE: ${job ? JSON.stringify({ title: job.title, company: job.company, description: job.description, benefits: job.benefits }) : "aucun poste précis"}` },
    ], { json: true });
    return safeJson(raw, { subject: "", email: "", linkedin_message: "", call_script_bullets: [] });
  });

/** SMART: kit d'entretien structuré pour un candidat sur un poste. */
export const smartInterviewKitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: z.string().uuid(), jobId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const { data: cand } = await supabase.from("fl_candidates").select("*").eq("id", data.candidateId).eq("user_id", userId).single();
    const job = data.jobId
      ? (await supabase.from("fl_jobs").select("*").eq("id", data.jobId).eq("user_id", userId).single()).data
      : null;
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: "Crée un kit d'entretien. JSON strict: {stages:[{name,duration_min,goal,questions:[{q,what_to_listen_for}]}], technical_exercise, scorecard:[{criterion,weight}], red_flags_to_probe[]}" },
      { role: "user", content: `CANDIDAT: ${JSON.stringify({ name: cand?.full_name, skills: cand?.skills, experiences: cand?.experiences, gaps: (cand?.ai_analysis as any)?.red_flags })}\n\nPOSTE: ${job ? JSON.stringify({ title: job.title, required_skills: job.required_skills, responsibilities: job.responsibilities }) : "généraliste"}` },
    ], { json: true });
    return safeJson(raw, { stages: [], scorecard: [], red_flags_to_probe: [] });
  });
