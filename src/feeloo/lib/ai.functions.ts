import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(model: string, messages: Array<{ role: string; content: string }>, opts: { json?: boolean; tools?: unknown } = {}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const body: Record<string, unknown> = { model, messages };
  if (opts.json) body.response_format = { type: "json_object" };
  if (model.startsWith("openai/gpt-5.6")) body.reasoning_effort = "none";
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function safeJson<T = unknown>(txt: string, fallback: T): T {
  try {
    const m = txt.match(/\{[\s\S]*\}$/) || txt.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : txt) as T;
  } catch {
    return fallback;
  }
}

async function getUserModel(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("fl_settings").select("ai_model").eq("user_id", userId).maybeSingle();
  const { resolveAppAiModel } = await import("@/lib/ai-models.server");
  return resolveAppAiModel(supabase, userId, "feeloo", data?.ai_model || "openai/gpt-5.5");
}

/** Analyze a raw CV (text) and upsert a candidate. */
export const analyzeCvFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      rawCv: z.string().min(20),
      source: z.string().optional(),
      sourceRef: z.string().optional(),
      emailFrom: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const model = await getUserModel(supabase, userId);
    const system = `Tu es un expert RH. Analyse le CV fourni et retourne un JSON strict avec les clés:
full_name, email, phone, location, headline, summary (5-8 lignes analytiques),
skills (array de strings, max 25), soft_skills (array), languages (array {name, level}),
experiences (array {company, role, start, end, description, achievements[]}),
educations (array {school, degree, field, start, end}),
certifications (array), links ({linkedin, github, portfolio}), years_experience (number),
seniority ("junior"|"mid"|"senior"|"lead"|"executive"),
desired_roles (array),
ai_analysis ({strengths[], red_flags[], culture_fit_notes, best_roles[], recommended_questions[], overall_score (0-100), summary_paragraph}).
Réponds UNIQUEMENT en JSON valide.`;
    const user = `CV brut:\n\n${data.rawCv.slice(0, 20000)}`;
    const raw = await callAI(model, [
      { role: "system", content: system },
      { role: "user", content: user },
    ], { json: true });
    const parsed = safeJson<Record<string, any>>(raw, {});
    const fullName = parsed.full_name || parsed.fullName || data.emailFrom || "Candidat sans nom";
    const row = {
      user_id: userId,
      full_name: String(fullName).slice(0, 200),
      email: parsed.email ?? data.emailFrom ?? null,
      phone: parsed.phone ?? null,
      location: parsed.location ?? null,
      headline: parsed.headline ?? null,
      summary: parsed.summary ?? null,
      skills: parsed.skills ?? [],
      soft_skills: parsed.soft_skills ?? [],
      languages: parsed.languages ?? [],
      experiences: parsed.experiences ?? [],
      educations: parsed.educations ?? [],
      certifications: parsed.certifications ?? [],
      links: parsed.links ?? {},
      years_experience: parsed.years_experience ?? null,
      seniority: parsed.seniority ?? null,
      desired_roles: parsed.desired_roles ?? [],
      ai_analysis: parsed.ai_analysis ?? {},
      source: data.source ?? "manual",
      source_ref: data.sourceRef ?? null,
      raw_cv: data.rawCv.slice(0, 40000),
      status: "new",
    };
    const { data: cand, error } = await supabase.from("fl_candidates").insert(row).select("*").single();
    if (error) throw error;
    await supabase.from("fl_activity_log").insert({ user_id: userId, kind: "candidate_created", message: `Nouveau candidat analysé: ${cand.full_name}`, metadata: { candidate_id: cand.id, source: cand.source } });
    // Match against all existing jobs
    await rankMatchesForCandidateInternal(supabase, userId, cand);
    return cand;
  });

/** Analyze a raw job description and upsert a job. */
export const analyzeJobFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rawInput: z.string().min(10), source: z.string().optional(), sourceRef: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const model = await getUserModel(supabase, userId);
    const system = `Tu es un expert RH. Analyse la description de poste et retourne un JSON strict:
title, company, location, employment_type, seniority, description (paragraphe reformulé attractif),
responsibilities (array), required_skills (array), nice_to_have (array), requirements (array),
benefits (array), salary_min (number|null), salary_max (number|null), salary_currency, languages (array),
ai_analysis ({ideal_candidate_profile, key_competencies[], sourcing_channels[], interview_stages[], risk_factors[], compensation_benchmark, summary_paragraph, priority_score (0-100)}).
Réponds UNIQUEMENT en JSON valide.`;
    const raw = await callAI(model, [
      { role: "system", content: system },
      { role: "user", content: `Données du poste:\n${data.rawInput.slice(0, 10000)}` },
    ], { json: true });
    const parsed = safeJson<Record<string, any>>(raw, {});
    const row = {
      user_id: userId,
      title: String(parsed.title || "Poste sans titre").slice(0, 200),
      company: parsed.company ?? null,
      location: parsed.location ?? null,
      employment_type: parsed.employment_type ?? null,
      seniority: parsed.seniority ?? null,
      description: parsed.description ?? null,
      responsibilities: parsed.responsibilities ?? [],
      required_skills: parsed.required_skills ?? [],
      nice_to_have: parsed.nice_to_have ?? [],
      requirements: parsed.requirements ?? [],
      benefits: parsed.benefits ?? [],
      salary_min: parsed.salary_min ?? null,
      salary_max: parsed.salary_max ?? null,
      salary_currency: parsed.salary_currency ?? null,
      languages: parsed.languages ?? [],
      ai_analysis: parsed.ai_analysis ?? {},
      source: data.source ?? "manual",
      source_ref: data.sourceRef ?? null,
      raw_input: data.rawInput.slice(0, 20000),
      status: "open",
    };
    const { data: job, error } = await supabase.from("fl_jobs").insert(row).select("*").single();
    if (error) throw error;
    await supabase.from("fl_activity_log").insert({ user_id: userId, kind: "job_created", message: `Nouvelle fiche de poste: ${job.title}`, metadata: { job_id: job.id, source: job.source } });
    await rankMatchesForJobInternal(supabase, userId, job);
    return job;
  });

async function scorePair(model: string, candidate: any, job: any) {
  const system = `Évalue la correspondance candidat/poste. Retourne un JSON strict:
{score (0-100), score_breakdown ({skills, experience, seniority, language, culture}), strengths[], gaps[], reasoning (2-3 phrases)}.
Réponds uniquement en JSON.`;
  const user = `POSTE:\nTitre: ${job.title}\nSéniorité: ${job.seniority}\nCompétences requises: ${JSON.stringify(job.required_skills)}\nNice-to-have: ${JSON.stringify(job.nice_to_have)}\nExigences: ${JSON.stringify(job.requirements)}\nDescription: ${job.description ?? ""}\n\nCANDIDAT:\nNom: ${candidate.full_name}\nTitre: ${candidate.headline}\nExpérience: ${candidate.years_experience} ans, séniorité: ${candidate.seniority}\nCompétences: ${JSON.stringify(candidate.skills)}\nExpériences: ${JSON.stringify(candidate.experiences)}\nLangues: ${JSON.stringify(candidate.languages)}\nRésumé: ${candidate.summary ?? ""}`;
  const raw = await callAI(model, [
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true });
  return safeJson<Record<string, any>>(raw, { score: 0, score_breakdown: {}, strengths: [], gaps: [], reasoning: "Analyse indisponible" });
}

async function rankMatchesForCandidateInternal(supabase: any, userId: string, candidate: any) {
  const { data: jobs } = await supabase.from("fl_jobs").select("*").eq("user_id", userId).eq("status", "open");
  if (!jobs?.length) return;
  const model = await getUserModel(supabase, userId);
  for (const job of jobs.slice(0, 20)) {
    try {
      const r = await scorePair(model, candidate, job);
      await supabase.from("fl_candidate_job_matches").upsert({
        user_id: userId,
        candidate_id: candidate.id,
        job_id: job.id,
        score: Number(r.score) || 0,
        score_breakdown: r.score_breakdown || {},
        strengths: r.strengths || [],
        gaps: r.gaps || [],
        reasoning: r.reasoning || null,
      }, { onConflict: "candidate_id,job_id" });
    } catch (e) { console.error("match err", e); }
  }
}

async function rankMatchesForJobInternal(supabase: any, userId: string, job: any) {
  const { data: cands } = await supabase.from("fl_candidates").select("*").eq("user_id", userId);
  if (!cands?.length) return;
  const model = await getUserModel(supabase, userId);
  for (const c of cands.slice(0, 40)) {
    try {
      const r = await scorePair(model, c, job);
      await supabase.from("fl_candidate_job_matches").upsert({
        user_id: userId,
        candidate_id: c.id,
        job_id: job.id,
        score: Number(r.score) || 0,
        score_breakdown: r.score_breakdown || {},
        strengths: r.strengths || [],
        gaps: r.gaps || [],
        reasoning: r.reasoning || null,
      }, { onConflict: "candidate_id,job_id" });
    } catch (e) { console.error("match err", e); }
  }
}

export const rematchAllFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: jobs } = await supabase.from("fl_jobs").select("*").eq("user_id", userId).eq("status", "open");
    for (const job of jobs ?? []) await rankMatchesForJobInternal(supabase, userId, job);
    return { ok: true, jobs: jobs?.length ?? 0 };
  });

export const chatAboutEntityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      entityType: z.enum(["candidate", "job"]),
      entityId: z.string().uuid(),
      conversationId: z.string().uuid().optional(),
      message: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const model = await getUserModel(supabase, userId);
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase.from("fl_ai_conversations").insert({
        user_id: userId, entity_type: data.entityType, entity_id: data.entityId, title: data.message.slice(0, 60),
      }).select("id").single();
      if (convErr || !conv) throw convErr ?? new Error("Impossible de créer la conversation");
      conversationId = conv.id;
    }
    // Load entity context
    const table = data.entityType === "candidate" ? "fl_candidates" : "fl_jobs";
    const { data: entity } = await (supabase as any).from(table).select("*").eq("id", data.entityId).maybeSingle();
    const { data: history } = await supabase.from("fl_ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at");
    const system = `Tu es un assistant RH expert. Tu analyses ce ${data.entityType === "candidate" ? "candidat" : "poste"} et réponds aux questions du recruteur. Contexte:\n${JSON.stringify(entity).slice(0, 8000)}`;
    await supabase.from("fl_ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: data.message });
    const messages = [
      { role: "system", content: system },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];
    const reply = await callAI(model, messages);
    await supabase.from("fl_ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: reply });
    return { conversationId, reply };
  });

export const listConversationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entityType: z.enum(["candidate", "job"]), entityId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv } = await supabase.from("fl_ai_conversations")
      .select("id").eq("user_id", userId).eq("entity_type", data.entityType).eq("entity_id", data.entityId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!conv) return { conversationId: null, messages: [] };
    const { data: messages } = await supabase.from("fl_ai_messages").select("id, role, content, created_at").eq("conversation_id", conv.id).order("created_at");
    return { conversationId: conv.id, messages: messages ?? [] };
  });

export const deleteEntityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entityType: z.enum(["candidate", "job"]), id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const table = data.entityType === "candidate" ? "fl_candidates" : "fl_jobs";
    const { error } = await (supabase as any).from(table).delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });