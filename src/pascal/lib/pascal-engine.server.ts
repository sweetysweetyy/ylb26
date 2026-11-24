import { generateText } from "ai";
import { createGateway, PASCAL_MODEL } from "./ai-gateway.server";
import { buildSystemPrompt, buildFirstOutreachPrompt, buildReplyPrompt, buildFollowupPrompt } from "./pascal-prompt.server";
import { sendGmail, listThreadMessages, decodeGmailBody, getHeader, searchMessages, getGmailMessage, type GmailMessage } from "./google-api.server";
import { getAccessTokenForUser } from "./google-oauth.server";
import { listFreeSlots, createCalendarEvent } from "./google-calendar.server";

interface AgentOutput {
  subject: string | null;
  body: string;
  status_hint?: string;
  mood_detected?: string;
  proposed_slot_iso?: string | null;
  confirmed_slot_iso?: string | null;
  tactic_used?: string;
}

type PlanStep = { delay_hours?: number; angle?: string; instruction?: string };

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? (value ?? "").trim().toLowerCase();
}

function isExternalReply(message: { labelIds?: string[]; payload: { headers: Array<{ name: string; value: string }> } }, prospectEmail: string, userEmail?: string | null): boolean {
  const labels = message.labelIds ?? [];
  if (labels.includes("DRAFT") || labels.includes("SENT")) return false;
  const from = normalizeEmail(getHeader(message.payload.headers, "From"));
  const prospect = normalizeEmail(prospectEmail);
  const owner = normalizeEmail(userEmail);
  if (!from) return false;
  if (prospect && from === prospect) return true;
  if (owner && from === owner) return false;
  return !labels.includes("SENT");
}

function mapMoodToTrigger(mood: string | null | undefined, hasReplied: boolean): string {
  if (mood === "angry") return "angry";
  if (mood === "objecting") return "objection";
  if (mood === "hesitant" || mood === "interested" || mood === "ready") return "interested_but_wait";
  if (hasReplied) return "ghosted";
  return "no_reply";
}

function getPlanStep(plan: { steps?: unknown } | null | undefined, index: number): PlanStep | null {
  const steps = Array.isArray(plan?.steps) ? plan.steps as PlanStep[] : [];
  return steps[index] ?? steps[steps.length - 1] ?? null;
}

function firstConversation(value: unknown): { id: string; gmail_thread_id: string | null; subject: string | null } | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as { id: string; gmail_thread_id: string | null; subject: string | null };
  return null;
}

async function findProspectMessages(userId: string, prospectEmail: string, subject?: string | null): Promise<GmailMessage[]> {
  const subjectQuery = subject ? ` subject:"${subject.replace(/"/g, "")}"` : "";
  const refs = await searchMessages(userId, `from:${prospectEmail}${subjectQuery}`, 20);
  const messages: GmailMessage[] = [];
  for (const ref of refs) {
    try { messages.push(await getGmailMessage(userId, ref.id)); } catch { /* ignore unreadable message */ }
  }
  return messages.sort((a, b) => Number(a.internalDate) - Number(b.internalDate));
}

async function loadGmailConversation(userId: string, conv: { id: string; gmail_thread_id: string | null; subject?: string | null }, prospectEmail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (conv.gmail_thread_id) {
    try {
      return await listThreadMessages(userId, conv.gmail_thread_id);
    } catch (e) {
      if (!String(e).includes("404")) throw e;
    }
  }
  const messages = await findProspectMessages(userId, prospectEmail, conv.subject);
  const threadId = messages.at(-1)?.threadId ?? null;
  if (threadId && threadId !== conv.gmail_thread_id) {
    await supabaseAdmin.from("psc_conversations").update({ gmail_thread_id: threadId }).eq("id", conv.id);
  }
  return { id: threadId ?? conv.gmail_thread_id ?? conv.id, messages };
}

async function usableThreadId(userId: string, conv: { id: string; gmail_thread_id: string | null; subject?: string | null }, prospectEmail: string) {
  if (conv.gmail_thread_id) {
    try { await listThreadMessages(userId, conv.gmail_thread_id); return conv.gmail_thread_id; } catch { /* fallback below */ }
  }
  const messages = await findProspectMessages(userId, prospectEmail, conv.subject);
  return messages.at(-1)?.threadId ?? undefined;
}

function planStepToPrompt(plan: { name?: string; description?: string; steps?: unknown } | null | undefined, step: PlanStep | null, attempt: number) {
  if (!plan || !step) return undefined;
  return `Plan actif: ${plan.name ?? "Plan d'action"}\n${plan.description ?? ""}\nÉtape ${attempt}: ${step.angle ?? "angle libre"}\nInstruction prioritaire: ${step.instruction ?? "Adapter la relance au contexte."}`;
}

async function logKpi(userId: string, prospectId: string | null, event: string, payload: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("psc_kpi_events").insert({ user_id: userId, prospect_id: prospectId, event, payload: payload as never });
}

async function recordAutoSkill(userId: string, tactic: string, outcome: "used" | "win" | "loss") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const summary = tactic.slice(0, 80);
  const { data: existing } = await supabaseAdmin.from("psc_auto_skills").select("*").eq("user_id", userId).eq("summary", summary).maybeSingle();
  if (!existing) {
    await supabaseAdmin.from("psc_auto_skills").insert({ user_id: userId, summary, tactic, win_count: outcome === "win" ? 1 : 0, loss_count: outcome === "loss" ? 1 : 0, score: outcome === "win" ? 1 : 0, last_used_at: new Date().toISOString() });
    return;
  }
  const win = existing.win_count + (outcome === "win" ? 1 : 0);
  const loss = existing.loss_count + (outcome === "loss" ? 1 : 0);
  const score = win - loss;
  await supabaseAdmin.from("psc_auto_skills").update({ win_count: win, loss_count: loss, score, last_used_at: new Date().toISOString() }).eq("id", existing.id);
}

async function upsertProspectState(userId: string, prospectId: string, mood: string | undefined, meetingIso?: string | null) {
  if (!mood && !meetingIso) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: Record<string, unknown> = { user_id: userId, prospect_id: prospectId, updated_at: new Date().toISOString() };
  if (mood) patch.mood = mood;
  if (meetingIso) patch.meeting_iso = meetingIso;
  await supabaseAdmin.from("psc_prospect_state").upsert(patch as never, { onConflict: "prospect_id" });
}

async function selectActionPlan(userId: string, prospectId: string, mood: string | null | undefined, hasReplied: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: state } = await supabaseAdmin.from("psc_prospect_state").select("*, action_plans:psc_action_plans(*)").eq("prospect_id", prospectId).maybeSingle();
  const activePlan = state?.action_plans as { id: string; name: string; description: string; trigger: string; steps: unknown[] } | null;
  if (activePlan) return { state, plan: activePlan };
  const trigger = mapMoodToTrigger(mood, hasReplied);
  const { data: plan } = await supabaseAdmin
    .from("psc_action_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("trigger", trigger)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (plan) {
    await supabaseAdmin.from("psc_prospect_state").upsert({
      user_id: userId,
      prospect_id: prospectId,
      mood: mood ?? "neutral",
      active_plan_id: plan.id,
      plan_step: 0,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "prospect_id" });
  }
  return { state, plan: plan as typeof activePlan };
}

async function loadSkillsBundle(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: skills }, { data: autos }, { data: mems }] = await Promise.all([
    supabaseAdmin.from("psc_agent_skills").select("title, category, content, priority").eq("user_id", userId).eq("active", true).order("priority", { ascending: false }).limit(20),
    supabaseAdmin.from("psc_auto_skills").select("summary, tactic, score, win_count, loss_count").eq("user_id", userId).order("score", { ascending: false }).limit(10),
    supabaseAdmin.from("psc_agent_memory").select("kind, technique, outcome").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
  ]);
  const skillsStr = (skills ?? []).map((s) => `- [${s.category}] ${s.title}: ${s.content}`).join("\n");
  const autosStr = (autos ?? []).map((a) => `- ${a.tactic} (score ${a.score}, ${a.win_count}W/${a.loss_count}L)`).join("\n");
  const memStr = (mems ?? []).map((m) => `- ${m.kind.toUpperCase()}: ${m.technique} → ${m.outcome}`).join("\n");
  return { skillsStr, autosStr, memStr };
}

async function loadToolsStr(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("psc_agent_tools").select("name, kind, description, enabled").eq("user_id", userId).eq("enabled", true).limit(30);
  if (!data?.length) return "";
  return data.map((t) => `- ${t.name} (${t.kind})${t.description ? " — " + t.description : ""}`).join("\n");
}

async function loadPlanForProspect(userId: string, prospectId: string, mood: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: state } = await supabaseAdmin.from("psc_prospect_state").select("*, action_plans:psc_action_plans(*)").eq("prospect_id", prospectId).maybeSingle();
  let plan = state?.action_plans as { name: string; description: string; steps: unknown[] } | null;
  if (!plan) {
    const triggerMap: Record<string, string> = { angry: "angry", ghosted: "ghosted", objecting: "objection", hesitant: "interested_but_wait" };
    const trigger = triggerMap[mood] ?? "no_reply";
    const { data: p } = await supabaseAdmin.from("psc_action_plans").select("*").eq("user_id", userId).eq("trigger", trigger).eq("active", true).limit(1).maybeSingle();
    plan = p as typeof plan;
  }
  if (!plan) return null;
  return `Plan: ${plan.name}\n${plan.description}\nÉtapes: ${JSON.stringify(plan.steps)}`;
}

async function computeSameDay(userId: string, conversationId: string | null): Promise<boolean> {
  if (!conversationId) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: last } = await supabaseAdmin
    .from("psc_messages")
    .select("sent_at, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "pascal")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return false;
  const t = new Date(last.sent_at ?? last.created_at);
  const today = new Date();
  return t.toDateString() === today.toDateString();
}

async function maybeCalendarSlots(userId: string, cfg: {
  calendar_id: string; timezone: string; working_hours_start: string; working_hours_end: string; meeting_duration_min: number;
}) {
  try {
    const slots = await listFreeSlots(userId, {
      calendarId: cfg.calendar_id,
      timezone: cfg.timezone,
      workStart: cfg.working_hours_start,
      workEnd: cfg.working_hours_end,
      durationMin: cfg.meeting_duration_min,
      maxSlots: 5,
    });
    return slots;
  } catch {
    return [];
  }
}

async function loadContext(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: kb }, { data: cfg }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("psc_knowledge_base").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("psc_agent_config").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("profiles").select("company_name, full_name").eq("id", userId).maybeSingle(),
  ]);
  if (!kb || !cfg) throw new Error("Configuration PASCAL incomplète");
  return { kb, cfg, companyName: profile?.company_name ?? null };
}

async function callPascal(systemPrompt: string, userPrompt: string): Promise<AgentOutput> {
  const gateway = createGateway();
  const { text } = await generateText({
    model: gateway(PASCAL_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
  });
  // Extract JSON
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("PASCAL n'a pas renvoyé de JSON: " + text.slice(0, 200));
  const parsed = JSON.parse(match[0]) as AgentOutput;
  if (!parsed.body) throw new Error("Réponse PASCAL sans body");
  return parsed;
}

async function logRun(userId: string, prospectId: string | null, kind: "scan_sheet" | "first_outreach" | "reply" | "followup", status: "success" | "error" | "skipped", detail?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("psc_agent_runs").insert({ user_id: userId, prospect_id: prospectId, kind, status, detail: detail?.slice(0, 1500) });
}

export async function sendFirstOutreach(userId: string, prospectId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { data: prospect } = await supabaseAdmin.from("psc_prospects").select("*").eq("id", prospectId).maybeSingle();
    if (!prospect) throw new Error("Prospect introuvable");
    if (prospect.status !== "new") return { skipped: true };

    const { kb, cfg, companyName } = await loadContext(userId);
    if (cfg.paused) { await logRun(userId, prospectId, "first_outreach", "skipped", "Agent en pause"); return { skipped: true }; }

    const { skillsStr, autosStr, memStr } = await loadSkillsBundle(userId);
    const slots = await maybeCalendarSlots(userId, cfg);
    const slotsStr = slots.length ? slots.map((s) => `- ${s.display} (ISO: ${s.startIso})`).join("\n") : "";
    const toolsStr = await loadToolsStr(userId);
    const system = buildSystemPrompt(kb, cfg, companyName, { skills: skillsStr, autoSkills: autosStr, memory: memStr, calendarSlots: slotsStr, tools: toolsStr, sameDayAsPrevious: false });
    const userPrompt = buildFirstOutreachPrompt(prospect);
    const out = await callPascal(system, userPrompt);
    if (!out.subject) throw new Error("Subject manquant pour premier email");

    const { email: googleEmail } = await getAccessTokenForUser(userId);
    const sent = await sendGmail({
      userId,
      fromName: cfg.sender_name,
      fromEmail: googleEmail,
      to: prospect.email,
      subject: out.subject,
      body: out.body,
    });

    const { data: conv } = await supabaseAdmin.from("psc_conversations").insert({
      user_id: userId,
      prospect_id: prospectId,
      gmail_thread_id: sent.threadId,
      subject: out.subject,
      last_message_at: new Date().toISOString(),
    }).select().single();

    await supabaseAdmin.from("psc_messages").insert({
      user_id: userId,
      conversation_id: conv!.id,
      role: "pascal",
      subject: out.subject,
      body: out.body,
      gmail_message_id: sent.id,
    });

    const followupAt = new Date(Date.now() + cfg.followup_delay_hours * 3600 * 1000).toISOString();
    await supabaseAdmin.from("psc_prospects").update({
      status: "contacted",
      last_action_at: new Date().toISOString(),
      next_action_at: followupAt,
    }).eq("id", prospectId);

    await logRun(userId, prospectId, "first_outreach", "success", `Email envoyé à ${prospect.email}`);
    await logKpi(userId, prospectId, "first_email_sent", { subject: out.subject, tactic: out.tactic_used ?? null });
    if (out.tactic_used) await recordAutoSkill(userId, out.tactic_used, "used");
    return { ok: true };
  } catch (e) {
    await logRun(userId, prospectId, "first_outreach", "error", String(e));
    throw e;
  }
}

export async function pollAndRespondReplies(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { email: googleEmail } = await getAccessTokenForUser(userId);
  const { data: convs } = await supabaseAdmin
    .from("psc_conversations")
    .select("id, prospect_id, gmail_thread_id, subject, prospects:psc_prospects(status, email)")
    .eq("user_id", userId);
  if (!convs) return { processed: 0 };

  let processed = 0;
  let checked = 0;
  let errors = 0;
  for (const conv of convs) {
    const prospect = conv.prospects as unknown as { status: string; email: string } | null;
    if (!prospect) continue;
    if (["meeting_booked", "lost", "paused"].includes(prospect.status)) continue;
    checked++;
    try {
      const thread = await loadGmailConversation(userId, conv, prospect.email);
      const { data: localMsgs } = await supabaseAdmin
        .from("psc_messages")
        .select("gmail_message_id")
        .eq("conversation_id", conv.id);
      const known = new Set((localMsgs ?? []).map((m) => m.gmail_message_id).filter(Boolean));
      const newReplies = thread.messages.filter((m) => !known.has(m.id) && isExternalReply(m, prospect.email, googleEmail));

      for (const reply of newReplies) {
        const body = decodeGmailBody(reply);
        const subject = getHeader(reply.payload.headers, "Subject") ?? null;
        await supabaseAdmin.from("psc_messages").insert({
          user_id: userId,
          conversation_id: conv.id,
          role: "prospect",
          subject,
          body,
          gmail_message_id: reply.id,
          sent_at: new Date(Number(reply.internalDate)).toISOString(),
        });
        await supabaseAdmin.from("psc_prospects").update({ status: "replied", last_action_at: new Date().toISOString(), next_action_at: null }).eq("id", conv.prospect_id);
        await logKpi(userId, conv.prospect_id, "reply_received", { from: getHeader(reply.payload.headers, "From") ?? null, subject });
        // Auto-respond if enabled
        await respondToConversation(userId, conv.id);
        processed++;
      }
    } catch (e) {
      errors++;
      await logRun(userId, conv.prospect_id, "reply", "error", String(e));
    }
  }
  return { processed, checked, errors };
}

export async function respondToConversation(userId: string, conversationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conv } = await supabaseAdmin.from("psc_conversations").select("*, prospects:psc_prospects(*)").eq("id", conversationId).maybeSingle();
  if (!conv) return;
  const prospect = conv.prospects as unknown as { id: string; email: string; status: string };
  const { kb, cfg, companyName } = await loadContext(userId);
  if (cfg.paused || !cfg.autonomous_replies) {
    await logRun(userId, prospect.id, "reply", "skipped", "Réponses auto désactivées");
    return;
  }
  const { data: msgs } = await supabaseAdmin
    .from("psc_messages")
    .select("role, subject, body")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });
  if (!msgs?.length) return;

  const { data: state } = await supabaseAdmin.from("psc_prospect_state").select("mood").eq("prospect_id", prospect.id).maybeSingle();
  const { skillsStr, autosStr, memStr } = await loadSkillsBundle(userId);
  const { plan } = await selectActionPlan(userId, prospect.id, state?.mood ?? "neutral", true);
  const planStr = planStepToPrompt(plan, getPlanStep(plan, 0), 1) ?? await loadPlanForProspect(userId, prospect.id, state?.mood ?? "neutral");
  const slots = await maybeCalendarSlots(userId, cfg);
  const slotsStr = slots.length ? slots.map((s) => `- ${s.display} (ISO: ${s.startIso})`).join("\n") : "";
  const sameDay = await computeSameDay(userId, conversationId);
  const toolsStr = await loadToolsStr(userId);
  const system = buildSystemPrompt(kb, cfg, companyName, { skills: skillsStr, autoSkills: autosStr, memory: memStr, moodPlan: planStr ?? undefined, calendarSlots: slotsStr, tools: toolsStr, sameDayAsPrevious: sameDay });
  const out = await callPascal(system, buildReplyPrompt(msgs));

  const { email: googleEmail } = await getAccessTokenForUser(userId);
  const sent = await sendGmail({
    userId,
    fromName: cfg.sender_name,
    fromEmail: googleEmail,
    to: prospect.email,
    subject: `Re: ${conv.subject ?? ""}`,
    body: out.body,
    threadId: conv.gmail_thread_id ?? undefined,
  });

  await supabaseAdmin.from("psc_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    role: "pascal",
    body: out.body,
    gmail_message_id: sent.id,
  });

  // Auto-confirm meeting if agent detected a confirmed slot
  let bookedStatus: string | null = null;
  if (out.confirmed_slot_iso && cfg.auto_confirm_meetings) {
    try {
      const startIso = out.confirmed_slot_iso;
      const endIso = new Date(new Date(startIso).getTime() + (cfg.meeting_duration_min ?? 30) * 60 * 1000).toISOString();
      const ev = await createCalendarEvent(userId, {
        calendarId: cfg.calendar_id, timezone: cfg.timezone, startIso, endIso,
        summary: `Démo avec ${prospect.email}`,
        description: `Rendez-vous décroché par ${cfg.agent_name}.`,
        attendeeEmail: prospect.email,
      });
      bookedStatus = "meeting_booked";
      await upsertProspectState(userId, prospect.id, "ready", startIso);
      await logKpi(userId, prospect.id, "meeting_booked", { eventId: ev.id, link: ev.htmlLink, startIso });
      await recordAutoSkill(userId, out.tactic_used ?? "closing sequence", "win");
      await supabaseAdmin.from("psc_agent_memory").insert({ user_id: userId, prospect_id: prospect.id, kind: "win", technique: out.tactic_used ?? "closing", outcome: "meeting_booked" });
    } catch (e) {
      await logRun(userId, prospect.id, "reply", "error", "Calendar create failed: " + String(e));
    }
  }
  const nextStatus = (bookedStatus ?? ((out.status_hint === "meeting_booked" || out.status_hint === "lost") ? out.status_hint : "contacted")) as "contacted" | "meeting_booked" | "lost";
  const nextAction = nextStatus === "contacted" ? new Date(Date.now() + cfg.followup_delay_hours * 3600 * 1000).toISOString() : null;
  await supabaseAdmin.from("psc_prospects").update({ status: nextStatus, last_action_at: new Date().toISOString(), next_action_at: nextAction }).eq("id", prospect.id);
  if (out.mood_detected) await upsertProspectState(userId, prospect.id, out.mood_detected);
  await logKpi(userId, prospect.id, "reply_sent", { mood: out.mood_detected, tactic: out.tactic_used });
  if (out.tactic_used) await recordAutoSkill(userId, out.tactic_used, "used");
  await logRun(userId, prospect.id, "reply", "success", out.tactic_used ?? undefined);
}

export async function sendFollowupsDue(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin.from("psc_agent_config").select("*").eq("user_id", userId).maybeSingle();
  if (!cfg || cfg.paused) return { processed: 0 };

  const { data: due } = await supabaseAdmin
    .from("psc_prospects")
    .select("id, email, followups_sent, conversations:psc_conversations(id, gmail_thread_id, subject)")
    .eq("user_id", userId)
    .in("status", ["contacted", "replied"])
    .lte("next_action_at", new Date().toISOString())
    .lt("followups_sent", cfg.never_give_up ? (cfg.max_total_touches ?? cfg.max_followups) : cfg.max_followups);

  if (!due?.length) return { processed: 0 };
  const { kb, companyName } = await loadContext(userId);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  for (const p of due) {
    try {
      const conv = firstConversation(p.conversations);
      if (!conv) { skipped++; continue; }
      const { data: msgs } = await supabaseAdmin.from("psc_messages").select("role, subject, body").eq("conversation_id", conv.id).order("sent_at", { ascending: true });
      const hasReplied = (msgs ?? []).some((m) => m.role === "prospect");
      const attempt = (p.followups_sent ?? 0) + 1;
      const { data: state } = await supabaseAdmin.from("psc_prospect_state").select("mood, plan_step").eq("prospect_id", p.id).maybeSingle();
      const { plan } = await selectActionPlan(userId, p.id, state?.mood ?? (hasReplied ? "ghosted" : "neutral"), hasReplied);
      const stepIndex = state?.plan_step ?? Math.max(0, attempt - 1);
      const step = getPlanStep(plan, stepIndex);
      const planStr = planStepToPrompt(plan, step, attempt);
      const { skillsStr, autosStr, memStr } = await loadSkillsBundle(userId);
      const toolsStr = await loadToolsStr(userId);
      const slots = await maybeCalendarSlots(userId, cfg);
      const slotsStr = slots.length ? slots.map((s) => `- ${s.display} (ISO: ${s.startIso})`).join("\n") : "";
      const system = buildSystemPrompt(kb, cfg, companyName, { skills: skillsStr, autoSkills: autosStr, memory: memStr, moodPlan: planStr, calendarSlots: slotsStr, tools: toolsStr, sameDayAsPrevious: await computeSameDay(userId, conv.id) });
      const out = await callPascal(system, buildFollowupPrompt(msgs ?? [], attempt));
      const { email: googleEmail } = await getAccessTokenForUser(userId);
      const threadId = await usableThreadId(userId, conv, p.email);
      const sent = await sendGmail({
        userId,
        fromName: cfg.sender_name,
        fromEmail: googleEmail,
        to: p.email,
        subject: `Re: ${conv.subject ?? ""}`,
        body: out.body,
        threadId,
      });
      await supabaseAdmin.from("psc_messages").insert({ user_id: userId, conversation_id: conv.id, role: "pascal", body: out.body, gmail_message_id: sent.id });
      if (out.mood_detected) await upsertProspectState(userId, p.id, out.mood_detected);
      const planDelayHours = step?.delay_hours;
      const nextDelayHours = typeof planDelayHours === "number" && planDelayHours > 0 ? planDelayHours : cfg.followup_delay_hours;
      const maxTouches = cfg.never_give_up ? (cfg.max_total_touches ?? cfg.max_followups) : cfg.max_followups;
      const nextAt = attempt < maxTouches ? new Date(Date.now() + nextDelayHours * 3600 * 1000).toISOString() : null;
      const status = out.status_hint === "meeting_booked" ? "meeting_booked" : out.status_hint === "lost" ? "lost" : nextAt ? "contacted" : (cfg.never_give_up ? "contacted" : "lost");
      await supabaseAdmin.from("psc_prospects").update({ followups_sent: attempt, last_action_at: new Date().toISOString(), next_action_at: nextAt, status }).eq("id", p.id);
      await supabaseAdmin.from("psc_prospect_state").upsert({ user_id: userId, prospect_id: p.id, mood: out.mood_detected ?? state?.mood ?? "ghosted", active_plan_id: plan?.id ?? null, plan_step: stepIndex + 1, updated_at: new Date().toISOString() } as never, { onConflict: "prospect_id" });
      await logKpi(userId, p.id, "followup_sent", { attempt, plan: plan?.name ?? null, angle: step?.angle ?? null, tactic: out.tactic_used ?? null });
      if (out.tactic_used) await recordAutoSkill(userId, out.tactic_used, "used");
      await logRun(userId, p.id, "followup", "success", `Relance ${attempt}${plan?.name ? ` — ${plan.name}` : ""}${step?.angle ? ` / ${step.angle}` : ""}`);
      processed++;
    } catch (e) {
      errors++;
      await logRun(userId, p.id, "followup", "error", String(e));
    }
  }
  return { processed, skipped, errors };
}

export async function scanSheetForNewProspects(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getSheetValues } = await import("./google-api.server");
  const { data: sources } = await supabaseAdmin.from("psc_sheet_sources").select("*").eq("user_id", userId).eq("is_active", true);
  if (!sources?.length) return { added: 0 };

  let added = 0;
  for (const src of sources) {
    try {
      const range = `${src.sheet_name}!A1:Z`;
      const data = await getSheetValues(userId, src.spreadsheet_id, range);
      const rows = data.values ?? [];
      if (rows.length < 2) continue;
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (name?: string | null) => (name ? headers.indexOf(name.toLowerCase()) : -1);
      const ei = idx(src.email_column);
      if (ei === -1) continue;
      const ni = idx(src.name_column);
      const ci = idx(src.company_column);
      const xi = idx(src.context_column);

      const lastSeen = src.last_row_seen ?? 1;
      const newRows = rows.slice(Math.max(1, lastSeen));
      for (const row of newRows) {
        const email = (row[ei] ?? "").trim();
        if (!email || !email.includes("@")) continue;
        const { data: inserted } = await supabaseAdmin.from("psc_prospects").upsert({
          user_id: userId,
          source_id: src.id,
          email,
          full_name: ni >= 0 ? row[ni] ?? null : null,
          company: ci >= 0 ? row[ci] ?? null : null,
          context: xi >= 0 ? row[xi] ?? null : null,
          status: "new",
        }, { onConflict: "user_id,email", ignoreDuplicates: true }).select().maybeSingle();
        if (inserted) added++;
      }
      await supabaseAdmin.from("psc_sheet_sources").update({ last_row_seen: rows.length }).eq("id", src.id);
      await logRun(userId, null, "scan_sheet", "success", `+${newRows.length} lignes lues, ${added} prospects créés`);
    } catch (e) {
      await logRun(userId, null, "scan_sheet", "error", String(e));
    }
  }
  return { added };
}

export async function runAgentForNewProspects(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: newOnes } = await supabaseAdmin.from("psc_prospects").select("id").eq("user_id", userId).eq("status", "new").limit(20);
  if (!newOnes?.length) return { sent: 0 };
  let sent = 0;
  for (const p of newOnes) {
    try { await sendFirstOutreach(userId, p.id); sent++; } catch { /* logged */ }
  }
  return { sent };
}