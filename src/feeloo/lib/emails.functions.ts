import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const KindEnum = z.enum(["acknowledgement", "interview_invite", "rejection", "shortlist", "manual", "outreach"]);

/** Draft a candidate email with AI (acknowledgement, invite, rejection…). */
export const draftCandidateEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    kind: KindEnum.default("acknowledgement"),
    instructions: z.string().max(600).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { callAI, safeJson, getUserModel } = await import("@/feeloo/lib/hr-core.server");
    const [{ data: cand }, { data: settings }] = await Promise.all([
      supabase.from("fl_candidates").select("*").eq("id", data.candidateId).eq("user_id", userId).single(),
      supabase.from("fl_settings").select("sender_signature").eq("user_id", userId).maybeSingle(),
    ]);
    const job = data.jobId
      ? (await supabase.from("fl_jobs").select("title, company, location, description").eq("id", data.jobId).eq("user_id", userId).maybeSingle()).data
      : null;
    const model = await getUserModel(supabase, userId);
    const raw = await callAI(model, [
      { role: "system", content: `Rédige un email de recrutement en français, professionnel, chaleureux et concis. Type: ${data.kind}. JSON strict: {subject, body}. Termine par la signature fournie si elle existe.` },
      { role: "user", content: `CANDIDAT: ${JSON.stringify({ name: cand?.full_name, headline: cand?.headline, skills: (cand?.skills as any)?.slice?.(0, 10) })}\nPOSTE: ${job ? JSON.stringify(job) : "aucun"}\nSIGNATURE: ${settings?.sender_signature ?? "L'équipe recrutement"}\nCONSIGNES: ${data.instructions ?? "aucune"}` },
    ], { json: true });
    const out = safeJson<{ subject: string; body: string }>(raw, { subject: "", body: "" });
    return { ...out, to: cand?.email ?? null };
  });

/** Really send an email through the connected Gmail account; queues + logs everything. */
export const sendCandidateEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid().optional(),
    to: z.string().email(),
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(20000),
    kind: KindEnum.default("manual"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("fl_candidate_emails").insert({
      user_id: userId, candidate_id: data.candidateId, job_id: data.jobId ?? null,
      to_email: data.to, subject: data.subject, body: data.body, kind: data.kind, status: "queued",
    }).select("id").single();
    if (error) throw error;

    try {
      const { data: prefs } = await supabase.from("fl_settings").select("email_provider").eq("user_id", userId).maybeSingle();
      if (prefs?.email_provider === "sendy") {
        const { sendSendyMail } = await import("@/sendy/lib/sendy.server");
        const r = await sendSendyMail(supabase, userId, { to: data.to, subject: data.subject, text: data.body });
        if (!r.ok) throw new Error(r.error);
      } else {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: conn } = await supabaseAdmin.from("google_connections")
        .select("refresh_token, email:google_email").eq("user_id", userId).maybeSingle();
      if (!conn?.refresh_token) throw new Error("Compte Google non connecté — impossible d'envoyer l'email.");
      const { refreshGoogleAccessToken } = await import("@/feeloo/lib/google-refresh.server");
      const token = await refreshGoogleAccessToken(conn.refresh_token);

      const mime = [
        `From: ${conn.email ?? "me"}`,
        `To: ${data.to}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(data.subject)))}?=`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
        "",
        data.body,
      ].join("\r\n");
      const encoder = new TextEncoder().encode(mime);
      let bin = "";
      encoder.forEach((b) => { bin += String.fromCharCode(b); });
      const rawMsg = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: rawMsg }),
      });
      if (!res.ok) throw new Error(`Gmail ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }

      await supabase.from("fl_candidate_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id).eq("user_id", userId);
      await supabase.from("fl_activity_log").insert({
        user_id: userId, kind: "email_sent",
        message: `Email « ${data.subject} » envoyé à ${data.to}`,
        metadata: { candidate_id: data.candidateId, job_id: data.jobId ?? null },
      });
      return { ok: true, id: row.id };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      await supabase.from("fl_candidate_emails").update({ status: "error", error: msg }).eq("id", row.id).eq("user_id", userId);
      throw new Error(msg);
    }
  });

export const listCandidateEmailsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ candidateId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("fl_candidate_emails").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(50);
    if (data.candidateId) q = q.eq("candidate_id", data.candidateId);
    const { data: rows } = await q;
    return { emails: rows ?? [] };
  });
