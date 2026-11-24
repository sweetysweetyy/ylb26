/** Shared HR business core (server-only). Used by cron sync engine + server functions. */

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AnyClient = any;

export async function callAI(
  model: string,
  messages: Array<{ role: string; content: any }>,
  opts: { json?: boolean } = {},
): Promise<string> {
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
    if (res.status === 429) throw new Error("Limite de requêtes IA atteinte, réessaie dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés — recharge ton espace Lovable.");
    throw new Error(`AI ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export function safeJson<T = any>(txt: string, fallback: T): T {
  try {
    const cleaned = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : cleaned) as T;
  } catch {
    return fallback;
  }
}

export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Robust text extraction from any uploaded/attached document. */
export async function extractDocumentText(bytes: Uint8Array, filename: string): Promise<string> {
  const name = (filename || "").toLowerCase();
  const decode = () => new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  try {
    if (name.endsWith(".pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50)) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      return String(text || "").replace(/\u0000/g, " ").trim();
    }
    if (name.endsWith(".docx")) {
      // DOCX = zip; pull readable runs out of the raw stream as a best effort.
      const raw = decode();
      const runs = raw.match(/>[^<>{}]{3,}</g) ?? [];
      return runs.map((r) => r.slice(1, -1)).join(" ").replace(/\s+/g, " ").trim();
    }
    if (name.endsWith(".html") || name.endsWith(".htm")) return stripHtml(decode());
    return decode().replace(/\u0000/g, " ").trim();
  } catch (e) {
    console.error("extractDocumentText", filename, e);
    try { return decode(); } catch { return ""; }
  }
}

export async function getUserSettings(supabase: AnyClient, userId: string) {
  const { data } = await supabase.from("fl_settings").select("*").eq("user_id", userId).maybeSingle();
  return data ?? {};
}

export async function getUserModel(supabase: AnyClient, userId: string): Promise<string> {
  const s = await getUserSettings(supabase, userId);
  const { resolveAppAiModel } = await import("@/lib/ai-models.server");
  return resolveAppAiModel(supabase, userId, "feeloo", (s as any)?.ai_model || "openai/gpt-5.5");
}

const CV_SYSTEM = `Tu es un expert RH senior. Analyse le CV brut fourni (structure quelconque, ordre quelconque, langue quelconque) et EXTRAIS TOUTES les informations disponibles, sans en inventer.
Retourne un JSON strict:
full_name, email, phone, location, headline, summary (5-8 lignes analytiques),
skills (array de strings, max 30), soft_skills (array), languages (array {name, level}),
experiences (array {company, role, start, end, description, achievements[]}),
educations (array {school, degree, field, start, end}),
certifications (array), links ({linkedin, github, portfolio}), years_experience (number),
seniority ("junior"|"mid"|"senior"|"lead"|"executive"), desired_roles (array),
ai_analysis ({strengths[], red_flags[], culture_fit_notes, best_roles[], recommended_questions[], overall_score (0-100), summary_paragraph, extraction_confidence (0-100)}).
Si une info est absente, mets null ou []. Réponds UNIQUEMENT en JSON valide.`;

export async function analyzeCvAndInsert(
  supabase: AnyClient,
  userId: string,
  rawCv: string,
  meta: { source?: string; sourceRef?: string; emailFrom?: string; fileName?: string } = {},
) {
  const model = await getUserModel(supabase, userId);
  const raw = await callAI(model, [
    { role: "system", content: CV_SYSTEM },
    { role: "user", content: `Fichier: ${meta.fileName ?? "n/a"}\nExpéditeur: ${meta.emailFrom ?? "n/a"}\n\nCV brut:\n${rawCv.slice(0, 24000)}` },
  ], { json: true });
  const p = safeJson<Record<string, any>>(raw, {});
  const row = {
    user_id: userId,
    full_name: String(p.full_name || meta.fileName || meta.emailFrom || "Candidat sans nom").slice(0, 200),
    email: p.email ?? meta.emailFrom ?? null,
    phone: p.phone ?? null,
    location: p.location ?? null,
    headline: p.headline ?? null,
    summary: p.summary ?? null,
    skills: p.skills ?? [],
    soft_skills: p.soft_skills ?? [],
    languages: p.languages ?? [],
    experiences: p.experiences ?? [],
    educations: p.educations ?? [],
    certifications: p.certifications ?? [],
    links: p.links ?? {},
    years_experience: p.years_experience ?? null,
    seniority: p.seniority ?? null,
    desired_roles: p.desired_roles ?? [],
    ai_analysis: p.ai_analysis ?? {},
    source: meta.source ?? "manual",
    source_ref: meta.sourceRef ?? null,
    raw_cv: rawCv.slice(0, 40000),
    status: "new",
  };
  const { data: cand, error } = await supabase.from("fl_candidates").insert(row).select("*").single();
  if (error) throw error;
  await supabase.from("fl_activity_log").insert({
    user_id: userId, kind: "candidate_created",
    message: `Nouveau candidat analysé: ${cand.full_name}`,
    metadata: { candidate_id: cand.id, source: cand.source },
  });
  return cand;
}

const JOB_SYSTEM = `Tu es un expert RH. Analyse les données de poste (structure quelconque) et retourne un JSON strict:
title, company, location, employment_type, seniority, description (paragraphe reformulé attractif),
responsibilities[], required_skills[], nice_to_have[], requirements[], benefits[],
salary_min (number|null), salary_max (number|null), salary_currency, languages[],
ai_analysis ({ideal_candidate_profile, key_competencies[], sourcing_channels[], interview_stages[], risk_factors[], compensation_benchmark, summary_paragraph, priority_score (0-100)}).
Réponds UNIQUEMENT en JSON valide.`;

export async function analyzeJobAndInsert(
  supabase: AnyClient,
  userId: string,
  rawInput: string,
  meta: { source?: string; sourceRef?: string } = {},
) {
  const model = await getUserModel(supabase, userId);
  const raw = await callAI(model, [
    { role: "system", content: JOB_SYSTEM },
    { role: "user", content: `Données du poste:\n${rawInput.slice(0, 12000)}` },
  ], { json: true });
  const p = safeJson<Record<string, any>>(raw, {});
  const { data: job, error } = await supabase.from("fl_jobs").insert({
    user_id: userId,
    title: String(p.title || "Poste sans titre").slice(0, 200),
    company: p.company ?? null,
    location: p.location ?? null,
    employment_type: p.employment_type ?? null,
    seniority: p.seniority ?? null,
    description: p.description ?? null,
    responsibilities: p.responsibilities ?? [],
    required_skills: p.required_skills ?? [],
    nice_to_have: p.nice_to_have ?? [],
    requirements: p.requirements ?? [],
    benefits: p.benefits ?? [],
    salary_min: p.salary_min ?? null,
    salary_max: p.salary_max ?? null,
    salary_currency: p.salary_currency ?? null,
    languages: p.languages ?? [],
    ai_analysis: p.ai_analysis ?? {},
    priority: Number(p.ai_analysis?.priority_score) || 0,
    source: meta.source ?? "manual",
    source_ref: meta.sourceRef ?? null,
    raw_input: rawInput.slice(0, 20000),
    status: "open",
  }).select("*").single();
  if (error) throw error;
  await supabase.from("fl_activity_log").insert({
    user_id: userId, kind: "job_created",
    message: `Nouvelle fiche de poste: ${job.title}`,
    metadata: { job_id: job.id, source: job.source },
  });
  return job;
}

const MATCH_SYSTEM = `Évalue la correspondance candidat/poste. Retourne un JSON strict:
{score (0-100), score_breakdown ({skills, experience, seniority, language, culture}), strengths[], gaps[], reasoning (2-3 phrases)}.
Réponds uniquement en JSON.`;

export async function scorePair(model: string, candidate: any, job: any) {
  const user = `POSTE:\nTitre: ${job.title}\nSéniorité: ${job.seniority}\nCompétences requises: ${JSON.stringify(job.required_skills)}\nNice-to-have: ${JSON.stringify(job.nice_to_have)}\nExigences: ${JSON.stringify(job.requirements)}\nDescription: ${job.description ?? ""}\n\nCANDIDAT:\nNom: ${candidate.full_name}\nTitre: ${candidate.headline}\nExpérience: ${candidate.years_experience} ans, séniorité: ${candidate.seniority}\nCompétences: ${JSON.stringify(candidate.skills)}\nExpériences: ${JSON.stringify(candidate.experiences)}\nLangues: ${JSON.stringify(candidate.languages)}\nRésumé: ${candidate.summary ?? ""}`;
  const raw = await callAI(model, [
    { role: "system", content: MATCH_SYSTEM },
    { role: "user", content: user },
  ], { json: true });
  return safeJson<Record<string, any>>(raw, { score: 0, score_breakdown: {}, strengths: [], gaps: [], reasoning: "Analyse indisponible" });
}

async function upsertMatch(supabase: AnyClient, userId: string, candidateId: string, jobId: string, r: any) {
  await supabase.from("fl_candidate_job_matches").upsert({
    user_id: userId,
    candidate_id: candidateId,
    job_id: jobId,
    score: Number(r.score) || 0,
    score_breakdown: r.score_breakdown || {},
    strengths: r.strengths || [],
    gaps: r.gaps || [],
    reasoning: r.reasoning || null,
  }, { onConflict: "candidate_id,job_id" });
}

/** Jobs that still accept new profiles. */
export async function openJobs(supabase: AnyClient, userId: string) {
  const { data } = await supabase.from("fl_jobs").select("*")
    .eq("user_id", userId).eq("status", "open").eq("accepts_applications", true)
    .order("priority", { ascending: false });
  return data ?? [];
}

/** Candidates still available for staffing. */
export async function availableCandidates(supabase: AnyClient, userId: string) {
  const { data } = await supabase.from("fl_candidates").select("*")
    .eq("user_id", userId).eq("available", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function rankMatchesForCandidate(supabase: AnyClient, userId: string, candidate: any) {
  if (candidate?.available === false) return 0;
  const jobs = await openJobs(supabase, userId);
  if (!jobs.length) return 0;
  const model = await getUserModel(supabase, userId);
  let n = 0;
  for (const job of jobs.slice(0, 20)) {
    try { await upsertMatch(supabase, userId, candidate.id, job.id, await scorePair(model, candidate, job)); n++; }
    catch (e) { console.error("match err", e); }
  }
  return n;
}

export async function rankMatchesForJob(supabase: AnyClient, userId: string, job: any) {
  if (job?.accepts_applications === false || job?.status !== "open") return 0;
  const cands = await availableCandidates(supabase, userId);
  if (!cands.length) return 0;
  const model = await getUserModel(supabase, userId);
  let n = 0;
  for (const c of cands.slice(0, 40)) {
    try { await upsertMatch(supabase, userId, c.id, job.id, await scorePair(model, c, job)); n++; }
    catch (e) { console.error("match err", e); }
  }
  return n;
}
