import { getGmailThread, getUserAccessToken, listCalendarBusy, sendGmail } from "./google.server";
import {
  analyzeReply,
  composeFirstEmail,
  composeReply,
  type AgentSettings,
  type CompanyRow,
} from "./olly.server";

import { pe, type PeClient } from "./db";

type Admin = PeClient;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return pe(supabaseAdmin);
}

async function loadSettings(db: Admin, userId: string): Promise<AgentSettings> {
  const { data } = await db.from("pe_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as unknown as AgentSettings;
  const { data: created } = await db
    .from("pe_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return created as unknown as AgentSettings;
}

function nextCheck(minutes: number) {
  return new Date(Date.now() + Math.max(minutes, 5) * 60_000).toISOString();
}

async function logDecision(
  db: Admin,
  userId: string,
  prospectionId: string,
  kind: string,
  rationale: string,
  payload: Record<string, unknown> = {},
  intent?: string | null,
  interestScore?: number | null,
) {
  await db.from("pe_decisions").insert({
    user_id: userId,
    prospection_id: prospectionId,
    kind,
    rationale,
    payload: payload as never,
    intent: intent ?? null,
    interest_score: interestScore ?? null,
  });
}

/** Step 1 of the prospection: analyse, write, control, send the first email. */
export async function startProspection(userId: string, companyId: string) {
  const db = await admin();
  const settings = await loadSettings(db, userId);

  const { data: company, error: companyError } = await db
    .from("pe_companies")
    .select("*")
    .eq("id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error("Entreprise introuvable.");
  if (!company.email) throw new Error("Aucune adresse email exploitable sur cette fiche.");

  const { token, email: mailbox } = await getUserAccessToken(userId);

  const { data: existing } = await db
    .from("pe_prospections")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  let prospectionId = existing?.id as string | undefined;
  if (!prospectionId) {
    const { data: created, error } = await db
      .from("pe_prospections")
      .insert({
        user_id: userId,
        company_id: companyId,
        state: "READY",
        pipeline_status: "ACTIVE_PROSPECTION",
        contact_email: company.email,
        max_follow_ups: settings.max_follow_ups,
      })
      .select("id")
      .single();
    if (error) throw error;
    prospectionId = created.id;
  }

  const draft = await composeFirstEmail(settings, company as CompanyRow);
  if (!draft.body) throw new Error("OLLY n'a pas réussi à rédiger l'email.");

  const blocking = !draft.checks.factual_ok || !draft.checks.quality_ok;
  await logDecision(
    db,
    userId,
    prospectionId!,
    "FIRST_EMAIL_DRAFTED",
    draft.strategy?.angle ?? "Premier contact",
    { strategy: draft.strategy, checks: draft.checks, subject: draft.subject },
  );

  if (settings.require_validation || blocking) {
    await db
      .from("pe_prospections")
      .update({
        state: blocking ? "DRAFT" : "READY",
        subject: draft.subject,
        strategy: draft.strategy as never,
        error: blocking ? `Contrôle avant envoi: ${draft.checks.issues.join(" | ")}` : null,
      })
      .eq("id", prospectionId!);
    await db.from("pe_messages").insert({
      user_id: userId,
      prospection_id: prospectionId!,
      direction: "DRAFT",
      subject: draft.subject,
      body: draft.body,
      analysis: draft.strategy as never,
      checks: draft.checks as never,
    });
    return { prospectionId: prospectionId!, sent: false, draft };
  }

  const sent = await sendGmail({
    accessToken: token,
    from: mailbox ?? "me",
    to: company.email,
    subject: draft.subject,
    body: draft.body,
  });

  await db.from("pe_messages").insert({
    user_id: userId,
    prospection_id: prospectionId!,
    direction: "OUTBOUND",
    subject: draft.subject,
    body: draft.body,
    gmail_message_id: sent.id ?? null,
    gmail_thread_id: sent.threadId ?? null,
    analysis: draft.strategy as never,
    checks: draft.checks as never,
  });

  await db
    .from("pe_prospections")
    .update({
      state: "WAITING_REPLY",
      pipeline_status: "CONTACTED",
      subject: draft.subject,
      strategy: draft.strategy as never,
      gmail_thread_id: sent.threadId ?? null,
      contact_email: company.email,
      last_message_at: new Date().toISOString(),
      next_check_at: nextCheck(settings.check_interval_minutes),
      error: null,
      stop_reason: null,
    })
    .eq("id", prospectionId!);

  await db.from("pe_companies").update({ pipeline_status: "CONTACTED" }).eq("id", companyId);
  await logDecision(db, userId, prospectionId!, "FIRST_EMAIL_SENT", `Email envoyé à ${company.email}`, {
    subject: draft.subject,
  });

  return { prospectionId: prospectionId!, sent: true, draft };
}

/** One monitoring cycle for a single prospection: detect reply, analyse, answer or stop. */
export async function tickProspection(prospectionId: string) {
  const db = await admin();
  const { data: prospection } = await db
    .from("pe_prospections")
    .select("*")
    .eq("id", prospectionId)
    .maybeSingle();
  if (!prospection) return { status: "not_found" };
  const userId = prospection.user_id;

  const settings = await loadSettings(db, userId);
  const { data: company } = await db
    .from("pe_companies")
    .select("*")
    .eq("id", prospection.company_id)
    .maybeSingle();
  if (!company) return { status: "no_company" };

  if (!prospection.gmail_thread_id) {
    await db.from("pe_prospections").update({ next_check_at: nextCheck(settings.check_interval_minutes) }).eq("id", prospectionId);
    return { status: "no_thread" };
  }

  let token: string;
  let mailbox: string | null;
  try {
    const credentials = await getUserAccessToken(userId);
    token = credentials.token;
    mailbox = credentials.email;
  } catch (error) {
    await db
      .from("pe_prospections")
      .update({ state: "ERROR", error: (error as Error).message })
      .eq("id", prospectionId);
    return { status: "auth_error" };
  }

  const thread = await getGmailThread(token, prospection.gmail_thread_id);
  const { data: known } = await db
    .from("pe_messages")
    .select("gmail_message_id")
    .eq("prospection_id", prospectionId);
  const knownIds = new Set((known ?? []).map((row) => row.gmail_message_id));

  const inbound = thread.filter(
    (message) =>
      !knownIds.has(message.id) &&
      !message.labelIds.includes("SENT") &&
      !(mailbox && message.from.includes(mailbox)),
  );

  if (inbound.length === 0) {
    // No reply yet: follow up when the delay has passed and the quota allows it.
    const lastAt = prospection.last_message_at ? new Date(prospection.last_message_at).getTime() : 0;
    const dueForFollowUp =
      Date.now() - lastAt > settings.follow_up_delay_hours * 3_600_000 &&
      prospection.follow_up_count < (prospection.max_follow_ups ?? settings.max_follow_ups);

    if (dueForFollowUp && settings.auto_reply) {
      const draft = await composeReply(
        settings,
        company as CompanyRow,
        {
          intent: "UNCLEAR",
          sentiment: "neutre",
          interest_score: prospection.interest_score ?? 35,
          objection: null,
          question: null,
          need: null,
          recommended_action: `relance n°${prospection.follow_up_count + 1}: apporter un nouvel angle utile, très courte`,
          should_stop: false,
          stop_reason: null,
          pipeline_status: "TO_FOLLOW_UP",
          memory: (prospection.memory ?? {}) as never,
        },
        thread,
      );
      if (draft.body) {
        const last = thread[thread.length - 1];
        const sent = await sendGmail({
          accessToken: token,
          from: mailbox ?? "me",
          to: prospection.contact_email ?? (company.email as string),
          subject: prospection.subject ? `Re: ${prospection.subject}` : draft.subject,
          body: draft.body,
          threadId: prospection.gmail_thread_id,
          inReplyTo: last?.messageId ?? null,
        });
        await db.from("pe_messages").insert({
          user_id: userId,
          prospection_id: prospectionId,
          direction: "OUTBOUND",
          subject: draft.subject,
          body: draft.body,
          gmail_message_id: sent.id ?? null,
          gmail_thread_id: prospection.gmail_thread_id,
          checks: draft.checks as never,
        });
        await db
          .from("pe_prospections")
          .update({
            follow_up_count: prospection.follow_up_count + 1,
            last_message_at: new Date().toISOString(),
            next_check_at: nextCheck(settings.check_interval_minutes),
          })
          .eq("id", prospectionId);
        await logDecision(db, userId, prospectionId, "FOLLOW_UP_SENT", draft.strategy?.angle ?? "Relance");
        return { status: "followed_up" };
      }
    }

    if (prospection.follow_up_count >= (prospection.max_follow_ups ?? settings.max_follow_ups)) {
      const lastTouch = Date.now() - lastAt > settings.follow_up_delay_hours * 3_600_000;
      if (lastTouch) {
        await db
          .from("pe_prospections")
          .update({ state: "COMPLETED", stop_reason: "Nombre maximum de relances atteint", next_check_at: null })
          .eq("id", prospectionId);
        await logDecision(db, userId, prospectionId, "STOPPED", "Nombre maximum de relances atteint");
        return { status: "completed" };
      }
    }

    await db
      .from("pe_prospections")
      .update({ next_check_at: nextCheck(settings.check_interval_minutes), state: "WAITING_REPLY" })
      .eq("id", prospectionId);
    return { status: "no_reply" };
  }

  await db.from("pe_prospections").update({ state: "PROCESSING_REPLY" }).eq("id", prospectionId);

  for (const message of inbound) {
    await db.from("pe_messages").insert({
      user_id: userId,
      prospection_id: prospectionId,
      direction: "INBOUND",
      subject: message.subject,
      body: message.body,
      snippet: message.body.slice(0, 240),
      gmail_message_id: message.id,
      gmail_thread_id: message.threadId,
      sent_at: new Date(message.date).toISOString(),
    });
  }

  const analysis = await analyzeReply(
    settings,
    company as CompanyRow,
    (prospection.memory ?? {}) as Record<string, unknown>,
    thread,
  );

  await logDecision(
    db,
    userId,
    prospectionId,
    "REPLY_ANALYZED",
    analysis.recommended_action,
    analysis as never,
    analysis.intent,
    analysis.interest_score,
  );

  const terminal =
    analysis.should_stop ||
    ["UNSUBSCRIBE", "NOT_INTERESTED", "BOUNCE"].includes(analysis.intent);

  await db
    .from("pe_companies")
    .update({ pipeline_status: analysis.pipeline_status })
    .eq("id", company.id);

  if (terminal) {
    await db
      .from("pe_prospections")
      .update({
        state: analysis.intent === "UNSUBSCRIBE" ? "UNSUBSCRIBED" : "STOPPED",
        pipeline_status: analysis.pipeline_status,
        stop_reason: analysis.stop_reason ?? analysis.intent,
        interest_score: analysis.interest_score,
        last_intent: analysis.intent,
        memory: analysis.memory as never,
        next_check_at: null,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", prospectionId);
    await logDecision(db, userId, prospectionId, "STOPPED", analysis.stop_reason ?? analysis.intent, {}, analysis.intent);
    return { status: "stopped", intent: analysis.intent };
  }

  if (["OUT_OF_OFFICE", "AUTOMATED_REPLY"].includes(analysis.intent) || !settings.auto_reply) {
    await db
      .from("pe_prospections")
      .update({
        state: "WAITING_REPLY",
        pipeline_status: analysis.pipeline_status,
        interest_score: analysis.interest_score,
        last_intent: analysis.intent,
        memory: analysis.memory as never,
        next_check_at: nextCheck(settings.check_interval_minutes),
      })
      .eq("id", prospectionId);
    return { status: "no_action", intent: analysis.intent };
  }

  let availability = settings.meeting_slots ?? undefined;
  if (["REQUEST_MEETING", "REQUEST_CALL", "INTERESTED"].includes(analysis.intent)) {
    const busy = await listCalendarBusy(token);
    if (busy.length) {
      availability = `${availability ?? ""}\nCréneaux déjà occupés dans l'agenda: ${busy
        .map((slot) => `${slot.start} → ${slot.end}`)
        .join(", ")}`;
    }
  }

  const draft = await composeReply(settings, company as CompanyRow, analysis, thread, availability);
  const last = thread[thread.length - 1];

  if (!draft.body || !draft.checks.factual_ok) {
    await db
      .from("pe_prospections")
      .update({
        state: "PAUSED",
        error: `Réponse bloquée par le contrôle: ${draft.checks.issues.join(" | ")}`,
        interest_score: analysis.interest_score,
        last_intent: analysis.intent,
        memory: analysis.memory as never,
        next_check_at: null,
      })
      .eq("id", prospectionId);
    return { status: "blocked" };
  }

  const sent = await sendGmail({
    accessToken: token,
    from: mailbox ?? "me",
    to: prospection.contact_email ?? (company.email as string),
    subject: last?.subject?.startsWith("Re:") ? last.subject : `Re: ${prospection.subject ?? draft.subject}`,
    body: draft.body,
    threadId: prospection.gmail_thread_id,
    inReplyTo: last?.messageId ?? null,
  });

  await db.from("pe_messages").insert({
    user_id: userId,
    prospection_id: prospectionId,
    direction: "OUTBOUND",
    subject: draft.subject,
    body: draft.body,
    gmail_message_id: sent.id ?? null,
    gmail_thread_id: prospection.gmail_thread_id,
    analysis: draft.strategy as never,
    checks: draft.checks as never,
  });

  await db
    .from("pe_prospections")
    .update({
      state: "WAITING_REPLY",
      pipeline_status: analysis.pipeline_status,
      interest_score: analysis.interest_score,
      last_intent: analysis.intent,
      memory: analysis.memory as never,
      last_message_at: new Date().toISOString(),
      next_check_at: nextCheck(settings.check_interval_minutes),
      error: null,
    })
    .eq("id", prospectionId);

  await logDecision(
    db,
    userId,
    prospectionId,
    "REPLY_SENT",
    draft.strategy?.angle ?? analysis.recommended_action,
    { subject: draft.subject },
    analysis.intent,
    analysis.interest_score,
  );

  return { status: "replied", intent: analysis.intent };
}

/** Central scheduler pass: every prospection keeps its own independent due date. */
export async function runDueProspections(limit = 15) {
  const db = await admin();
  const { data } = await db
    .from("pe_prospections")
    .select("id")
    .in("state", ["WAITING_REPLY", "ACTIVE", "PROCESSING_REPLY", "SCHEDULED"])
    .lte("next_check_at", new Date().toISOString())
    .order("next_check_at", { ascending: true })
    .limit(limit);

  const results: Array<{ id: string; status: string }> = [];
  for (const row of data ?? []) {
    try {
      const outcome = await tickProspection(row.id);
      results.push({ id: row.id, status: String(outcome.status) });
    } catch (error) {
      console.error("tick failed", row.id, error);
      results.push({ id: row.id, status: `error: ${(error as Error).message}` });
    }
  }
  return results;
}
