import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, type ModelMessage } from "ai";
import process from "node:process";
import { z } from "zod";
import type { Database } from "@/pulsesupport/types";
import { odooClient } from "./odoo.server";
import { norm, phoneKey, pickBest } from "./customer-match";
import { pst } from "./db";

export type LiveConfig = {
  baseURL: string;
  key: string;
  liveModel: string;
  backendModel: string;
  openingInstructions?: string;
  agent?: Database["public"]["Tables"]["pst_agents"]["Row"];
  odoo?: { url: string; db: string; login: string; apiKey: string };
};

// Live voice model + cheapest backend model for delegated Odoo tasks.
const liveSettings = {
  baseURL: "https://ai.gateway.lovable.dev/v1",
  liveModel: "openai/gpt-live-1",
  backendModel: "openai/gpt-6-luna",
  openingInstructions:
    "Commence maintenant en français : salue brièvement le client, présente-toi comme assistante du support, et demande son nom, prénom et numéro de téléphone.",
};

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (url: string, headers: Record<string, string>, signal: AbortSignal) => Promise<LiveSocket>;

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type Transcript = {
  role: "user" | "assistant";
  text: string;
  start_ms: number;
  end_ms: number;
  listeningSound: boolean;
};
type ProviderEvent = {
  type: string;
  client_event_id?: string;
  error?: { client_event_id?: string; message?: string };
  session?: { id: string };
  delta?: string;
  start_ms?: number;
  end_ms?: number;
  offset_ms?: number;
  delegation?: { id: string; target: string };
};

export function getLiveConfig(): LiveConfig {
  const config: LiveConfig = {
    ...liveSettings,
    key: process.env["LOVABLE_API_KEY"] ?? "",
  };
  if ([config.baseURL, config.key, config.liveModel, config.backendModel].some((value) => !value)) {
    throw new Error("Missing Live relay configuration");
  }
  return config;
}

function gatewayAPIBase(baseURL: string) {
  return `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`;
}

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice gateway rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil }, async (url, headers, signal) => {
    const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
    const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
    if (!socket) throw await gatewayRejection(response);
    socket.accept();
    return workerSocket(socket);
  });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

export type AgentRow = Database["public"]["Tables"]["pst_agents"]["Row"];
export type ActionLog = { tool: string; input: unknown; result: unknown };
type SupportState = {
  actions: ActionLog[];
  done: Map<string, unknown>;
  partnerId?: number;
  customerName?: string;
};

function buildInstructions(agent: AgentRow) {
  return `Tu es ${agent.assistant_name}, l'assistante vocale du support client${agent.company ? ` de ${agent.company}` : ""}.
Langue : parle uniquement en français, avec un ton chaleureux, rassurant et des phrases courtes.
Étape 1 : demande au client son nom, son prénom et son numéro de téléphone pour le retrouver. Fais épeler le nom si besoin.
Étape 2 : demande l'objet de son appel.
${agent.sav_enabled ? "SAV : si le client appelle pour un problème après-vente, le backend vérifie s'il a un ticket ouvert : s'il existe, explique où il en est et rassure ; sinon, résume le problème, demande confirmation, puis fais créer le ticket et rassure le client." : ""}
Autres demandes : fais au mieux avec les informations du client.${agent.callback_enabled ? ` Si tu ne peux pas traiter la demande, propose un rendez-vous téléphonique avec un conseiller (${agent.callback_hours}) et confirme la date et l'heure avec le client avant de le planifier.` : ""}
${agent.instructions ? `Consignes de l'entreprise : ${agent.instructions.slice(0, 2000)}` : ""}
Backchannel policy: Use light listening sounds only.
Interruption policy: Stop your answer and listen when the user interrupts.
Delegation policy:
Backend tools: Search the customer in Odoo, read customer details and orders, read open SAV tickets, create a ticket, schedule a callback.
Delegate to the backend when: you have the customer's name and phone, when you need his tickets or orders, when he confirmed a ticket creation or callback, or when a correction changes a previous request.
Do not delegate to the backend when: Greeting, collecting details, clarifying. Never invent ticket numbers, statuses or dates: wait for the backend result before presenting it.`;
}

type Rec = { id: number; name: string; stage_id?: unknown; create_date?: string; user_id?: unknown };

function isListeningSound(text: string) {
  const normalized = text.toLowerCase().replace(/[\s\p{Pd}]/gu, "");
  return /^(?:m+hm+|uhhuh)[.,!]*$/.test(normalized);
}

function m2o(v: unknown) {
  return Array.isArray(v) ? v[1] : v || null;
}

export async function answerQuestion(
  messages: ModelMessage[],
  config: LiveConfig,
  correlation: { runID: string; sessionID: string | undefined; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
  support: SupportState,
  onAction: (action: ActionLog) => void,
) {
  signal.throwIfAborted();
  const agent = config.agent;
  if (!agent || !config.odoo) throw new Error("Agent not loaded");
  const odoo = odooClient(config.odoo);
  const provider = createOpenAI({
    baseURL: gatewayAPIBase(config.baseURL),
    apiKey: config.key,
    headers: {
      "Lovable-API-Key": config.key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
  // Runs an Odoo action and logs it; writes are deduplicated per call with a stable key.
  let repeatedCalls = 0;
  async function run(toolName: string, input: unknown, fn: () => Promise<unknown>, dedupeKey?: string) {
    signal.throwIfAborted();
    if (dedupeKey && support.done.has(dedupeKey)) return { already_done: true, ...(support.done.get(dedupeKey) as object) };
    // Reads are cached per call: identical lookups return the same data and push the model to answer.
    const readKey = dedupeKey ? undefined : `read:${toolName}:${JSON.stringify(input)}`;
    if (readKey && support.done.has(readKey)) {
      repeatedCalls++;
      return { ...(support.done.get(readKey) as object), note: "Data already retrieved. Do not call this tool again; answer the customer now." };
    }
    let result: unknown;
    try {
      result = await fn();
    } catch (e) {
      result = { error: e instanceof Error ? e.message : "Erreur Odoo" };
    }
    const ok = !(result as { error?: string }).error;
    if (dedupeKey && ok) support.done.set(dedupeKey, result as object);
    if (readKey && ok) support.done.set(readKey, result as object);
    const action = { tool: toolName, input, result };
    support.actions.push(action);
    onAction(action);
    return result;
  }
  const partnerInput = z.object({ partner_id: z.number().int() }).strict();
  const tools: Parameters<typeof streamText>[0]["tools"] = {
    find_customer: tool({
      description:
        "Search the customer in Odoo contacts. Convert spoken numbers to digits (e.g. 'zéro six soixante-six dix dix zéro zéro' -> '0666101000'). Use the spelled version of names when the customer spelled them.",
      inputSchema: z.object({ last_name: z.string(), first_name: z.string(), phone: z.string() }).strict(),
      execute: (args) =>
        run("find_customer", args, async () => {
          // Phone fields differ between Odoo versions (mobile removed in v18+).
          const available = await odoo.call<Record<string, unknown>>("res.partner", "fields_get", [], { attributes: ["type"] });
          const phoneFields = ["phone", "mobile", "phone_sanitized"].filter((f) => f in available);
          const fields = ["name", "email", "city", ...phoneFields];
          const key = phoneKey(args.phone);
          const or = (conds: unknown[][]) => [...Array(Math.max(conds.length - 1, 0)).fill("|"), ...conds];
          const nameConds = [args.last_name, args.first_name].map(norm).filter((w) => w.length >= 2).map((w) => ["name", "ilike", w]);
          // Odoo stores formatted phones ("+262 692 12 34 56"); "%" wildcards tolerate spaces.
          const phoneConds = key.length >= 6 ? phoneFields.map((f) => [f, "ilike", key.slice(-6).split("").join("%")]) : [];
          const found: Rec[] = [];
          for (const conds of [phoneConds, nameConds]) {
            if (!conds.length) continue;
            const rows = await odoo.call<Rec[]>("res.partner", "search_read", [or(conds)], { fields, limit: 20 });
            for (const r of rows) if (!found.some((x) => x.id === r.id)) found.push(r);
          }
          const cands = found.map((r) => ({ id: r.id, name: String(r.name), phones: phoneFields.map((f) => String((r as Record<string, unknown>)[f] || "")) }));
          const { match, ranked } = pickBest(cands, args);
          const full = match ? found.find((r) => r.id === match.id) : undefined;
          if (match) {
            support.partnerId = match.id;
            support.customerName = match.name;
          }
          return {
            match: full ? { id: full.id, name: full.name, email: (full as Record<string, unknown>)["email"] || null, city: (full as Record<string, unknown>)["city"] || null } : null,
            candidates: match ? [] : ranked.slice(0, 3).map((r) => ({ id: r.c.id, name: r.c.name, phone_matches: r.phone })),
            hint: match ? undefined : "No certain match: ask the customer to confirm or spell the last name, or repeat the phone number digit by digit.",
          };
        }),
    }),
    get_customer_details: tool({
      description: "Read the customer's recent sale orders in Odoo.",
      inputSchema: partnerInput,
      execute: ({ partner_id }) =>
        run("get_customer_details", { partner_id }, async () => {
          const orders = await odoo.call<Rec[]>("sale.order", "search_read", [[["partner_id", "child_of", partner_id]]], { fields: ["name", "state", "date_order", "amount_total"], limit: 5, order: "date_order desc" }).catch(() => []);
          return { orders };
        }),
    }),
  };
  if (agent.sav_enabled) {
    tools["get_open_tickets"] = tool({
      description: "List the customer's open after-sales (SAV) tickets with their current stage.",
      inputSchema: partnerInput,
      execute: ({ partner_id }) =>
        run("get_open_tickets", { partner_id }, async () => {
          const tickets = await odoo.call<Rec[]>(agent.ticket_model, "search_read", [[["partner_id", "child_of", partner_id], ["stage_id.fold", "=", false]]], { fields: ["name", "stage_id", "create_date", "user_id", "description"], limit: 5, order: "create_date desc" });
          return { tickets: tickets.map((t) => ({ id: t.id, subject: t.name, stage: m2o(t.stage_id), created: t.create_date, assigned_to: m2o(t.user_id) })) };
        }),
    });
    tools["create_ticket"] = tool({
      description: "Create an SAV ticket. Only after checking there is no open ticket for this issue AND after the customer confirmed.",
      inputSchema: z.object({ partner_id: z.number().int(), subject: z.string().min(3), description: z.string() }).strict(),
      execute: (args) =>
        run("create_ticket", args, async () => {
          const id = await odoo.call<number>(agent.ticket_model, "create", [{ name: args.subject, partner_id: args.partner_id, description: args.description }]);
          return { ticket_id: id, status: "succeeded" };
        }, `ticket:${args.partner_id}`),
    });
  }
  if (agent.callback_enabled) {
    tools["schedule_callback"] = tool({
      description: "Schedule a phone callback with an advisor in the Odoo calendar, after the customer confirmed date and time. datetime_utc is an ISO 8601 UTC datetime.",
      inputSchema: z.object({ partner_id: z.number().int(), datetime_utc: z.string(), reason: z.string() }).strict(),
      execute: (args) =>
        run("schedule_callback", args, async () => {
          const start = new Date(args.datetime_utc);
          if (Number.isNaN(start.getTime())) return { error: "Date invalide" };
          const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
          const id = await odoo.call<number>("calendar.event", "create", [{ name: `Rappel client – ${args.reason}`.slice(0, 120), start: fmt(start), stop: fmt(new Date(start.getTime() + 30 * 60_000)), partner_ids: [[6, 0, [args.partner_id]]], description: args.reason }]);
          return { event_id: id, status: "succeeded", start_utc: start.toISOString() };
        }, `callback:${args.partner_id}`),
    });
  }
  // Step messages may be per-step or cumulative depending on the SDK version: keep each once.
  const seenMessages = new Set<unknown>();
  consumeInput();
  const result = streamText({
    model: provider.responses(config.backendModel),
    abortSignal: signal,
    maxRetries: 0,
    stopWhen: stepCountIs(8),
    includeRawChunks: true,
    prepareStep({ stepNumber }) {
      consumeInput();
      // Force a spoken answer once data was fetched repeatedly or near the step limit.
      const mustAnswer = stepNumber >= 5 || repeatedCalls > 0;
      return mustAnswer ? { messages: [...messages], toolChoice: "none" as const } : { messages: [...messages] };
    },
    onStepFinish(step) {
      for (const m of step.response.messages) {
        const key = JSON.stringify(m);
        if (seenMessages.has(key)) continue;
        seenMessages.add(key);
        messages.push(m);
      }
    },
    headers: {
      "X-Lovable-AIG-Run-ID": correlation.runID,
      "X-Lovable-AIG-Metadata": JSON.stringify({
        live_session_id: correlation.sessionID,
        delegation_id: correlation.delegationID,
      }),
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
    system:
      `You are the backend of a French voice customer-support agent connected to Odoo. Now (UTC): ${new Date().toISOString()}. ` +
      "Transcripts may be incomplete or corrected; use the latest correction. Continue from completed tool results; never repeat completed writes. " +
      "Find the customer first with find_customer. If several candidates, ask which one. For SAV, call get_open_tickets before any create_ticket; create only if none matches and the customer confirmed. " +
      "Schedule a callback only after the customer confirmed the exact slot. If a tool returns an error, say the information is unavailable. " +
      "Answer in French, max 80 words, with verified facts only (ticket number, stage, date). No personal data beyond what's needed.",
    messages,
    tools,
  });
  let completed = false;
  let stepCompleted = false;
  let failed = false;
  // Drain through HTTP EOF so successful work is not recorded as cancelled by the Gateway.
  for await (const part of result.fullStream) {
    if (part.type === "start-step") stepCompleted = false;
    if (part.type === "raw" && part.rawValue && typeof part.rawValue === "object" && "type" in part.rawValue) {
      if (part.rawValue.type === "response.completed") stepCompleted = true;
      if (part.rawValue.type === "response.failed" || part.rawValue.type === "response.incomplete") failed = true;
    }
    if (part.type === "finish-step" && !stepCompleted) failed = true;
    if (part.type === "error" || part.type === "abort") failed = true;
    if (part.type === "finish") completed = part.finishReason === "stop";
  }
  signal.throwIfAborted();
  if (failed || !completed) throw new Error("The backend response did not complete");
  const answer = await result.text;
  if (!answer.trim()) throw new Error("The backend response had no answer");
  return answer;
}

function* commentaryChunks(content: string) {
  const encoder = new TextEncoder();
  let chunk = "";
  let bytes = 0;
  for (const [word] of content.matchAll(/\S+\s*|\s+/gu)) {
    // Chunks stay well inside the provider's per-append size limit.
    if (chunk && bytes + encoder.encode(word).length > 480) {
      yield chunk;
      chunk = "";
      bytes = 0;
    }
    for (const character of word) {
      const size = encoder.encode(character).length;
      if (bytes + size > 480) {
        yield chunk;
        chunk = "";
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
  }
  if (chunk) yield chunk;
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
): void {
  const config = { ...configuration };
  const support: SupportState = { actions: [], done: new Map() };
  const runID = crypto.randomUUID();
  const setupAbort = new AbortController();
  let gateway: LiveSocket | undefined;
  let sessionID: string | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let revision = 0;
  let task: AbortController | undefined;
  const pendingDelegations: Array<{
    event: ProviderEvent;
    plan?: ActionLog;
  }> = [];
  let completedDelegation: (typeof pendingDelegations)[number] | undefined;
  const backendMessages: ModelMessage[] = [];
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);
  const transcripts: Transcript[] = [];
  const delegations = new Set<string>();

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }

  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }

  function requestGreeting() {
    const content = (
      config.openingInstructions ??
      "Start the conversation now in your configured language and role. Give a brief greeting suited to this app's purpose, ask one relevant opening question, then listen."
    ).trim();
    if (!content || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    if (new TextEncoder().encode(content).length > 480) {
      emit({ type: "app.greeting.error", error: { message: "The opening instructions are too long" } });
      return;
    }
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content,
      }),
    );
  }

  function discardPendingWork() {
    pendingDelegations.length = 0;
    completedDelegation = undefined;
    clearTimeout(restartTimer);
    task?.abort();
  }

  async function saveCall() {
    const agent = config.agent;
    if (!agent || !transcripts.length) return;
    const lines: string[] = [];
    for (const t of transcripts) {
      const label = t.role === "user" ? "Client" : "Assistant";
      const last = lines[lines.length - 1];
      if (last?.startsWith(label + ": ")) lines[lines.length - 1] = last + t.text;
      else lines.push(`${label}: ${t.text}`);
    }
    const outcome = support.actions.some((a) => a.tool === "create_ticket")
      ? "Ticket créé"
      : support.actions.some((a) => a.tool === "schedule_callback")
        ? "Rappel planifié"
        : support.actions.some((a) => a.tool === "get_open_tickets")
          ? "Suivi ticket"
          : "Renseignement";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await pst(supabaseAdmin).from("pst_calls").insert({
      agent_id: agent.id,
      owner_id: agent.owner_id,
      customer_name: support.customerName ?? null,
      partner_id: support.partnerId ?? null,
      outcome,
      transcript: lines.join("\n").slice(0, 50_000),
      actions: support.actions as never,
    });
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    clearTimeout(startTimer);
    clearTimeout(startupTimer);
    clearTimeout(closeTimer);
    clearTimeout(restartTimer);
    clearGreeting();
    discardPendingWork();
    setupAbort.abort();
    close(gateway);
    close(browser);
    execution.waitUntil(saveCall().catch((e) => console.error("saveCall", e)));
    finishDrain?.();
  }

  function stop() {
    if (closing) return;
    closing = true;
    discardPendingWork();
    clearTimeout(startupTimer);
    clearTimeout(startTimer);
    clearGreeting();
    if (gateway?.readyState === 1) {
      execution.waitUntil(
        new Promise<void>((resolve) => {
          finishDrain = resolve;
        }),
      );
      closeTimer = setTimeout(finish, 15_000);
      try {
        gateway.send(JSON.stringify({ type: "session.close" }));
      } catch {
        finish();
      }
    } else {
      finish();
    }
  }

  function scheduleDelegation() {
    clearTimeout(restartTimer);
    if (closing || task || pendingDelegations.length === 0) return;
    restartTimer = setTimeout(() => void runDelegation(), 300);
  }

  function deliverResult(delegationID: string, answer: string, plan?: ActionLog) {
    if (closing) return;
    if (gateway?.readyState !== 1) return stop();
    try {
      for (const content of commentaryChunks(answer)) {
        gateway.send(
          JSON.stringify({
            type: "session.commentary.append",
            event_id: crypto.randomUUID(),
            delegation_id: delegationID,
            content,
          }),
        );
      }
      if (plan) emit({ type: "app.support.action", delegation_id: delegationID, plan });
      completedDelegation = pendingDelegations.shift();
    } catch {
      stop();
    }
  }

  async function runDelegation() {
    const pending = pendingDelegations[0];
    const event = pending?.event;
    const id = event?.delegation?.id;
    if (!pending || !event || !id || closing || task) return;
    if (!transcripts.some(({ role, text }) => role === "user" && text.trim())) return;
    const controller = new AbortController();
    task = controller;
    let taskRevision = revision;
    try {
      const answer = await answerQuestion(
        backendMessages,
        config,
        { runID, sessionID, delegationID: id },
        controller.signal,
        () => {
          const updates = transcripts.slice(transcriptCursor);
          if (updates.some(({ role, listeningSound }) => role === "user" && !listeningSound)) delete pending.plan;
          backendMessages.push(...updates.map(({ role, text }) => ({ role, content: text })));
          transcriptCursor = transcripts.length;
          taskRevision = revision;
        },
        support,
        (action) => {
          pending.plan = action;
          emit({ type: "app.support.action", action });
        },
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      deliverResult(id, answer.trim(), pending.plan);
    } catch {
      if (closing || controller.signal.aborted) return;
      backendMessages.push({
        role: "assistant",
        content:
          "The backend attempt failed. Completed tool results remain valid; verify uncertain external actions before any retry.",
      });
      if (taskRevision !== revision) return;
      deliverResult(id, "The backend could not finish the answer. Ask whether the user wants to try again.");
    } finally {
      if (task === controller) task = undefined;
      scheduleDelegation();
    }
  }

  function queueDelegation(event: ProviderEvent) {
    pendingDelegations.push({ event });
    emit({ type: "app.delegation.pending", delegation_id: event.delegation?.id });
    scheduleDelegation();
  }

  function receiveGateway(data: unknown) {
    try {
      if (typeof data !== "string" || data.length > 1024 * 1024) throw new Error("Invalid voice event");
      const event: ProviderEvent = JSON.parse(data);
      if (browser.readyState === 1) browser.send(data);
      if (event.type === "session.closed") return finish();
      if (event.type === "gateway.session.closing" || event.type === "gateway.error" || event.type === "app.error") {
        return stop();
      }
      if (closing) return;
      if (event.type === "gateway.session.created") {
        sessionID = event.session?.id;
        clearTimeout(startupTimer);
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: greetingCommand.id,
              delegation_id: null,
              content: "Begin the conversation now, following the instructions provided.",
            }),
          );
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        const listeningSound = role === "user" && Boolean(task) && isListeningSound(event.delta);
        transcripts.push({
          role,
          text: event.delta,
          start_ms: event.start_ms ?? 0,
          end_ms: event.end_ms ?? 0,
          listeningSound,
        });
        if (listeningSound) return;
        if (role === "user") {
          revision++;
          const offset = completedDelegation?.event.offset_ms;
          // Live has no transcript watermark; completed handoffs can receive late context.
          if (
            pendingDelegations.length === 0 &&
            completedDelegation &&
            typeof offset === "number" &&
            Number.isFinite(offset) &&
            offset >= 0 &&
            typeof event.start_ms === "number" &&
            Number.isFinite(event.start_ms) &&
            event.start_ms >= 0 &&
            event.start_ms <= offset
          ) {
            pendingDelegations.push(completedDelegation);
            completedDelegation = undefined;
          }
          if (pendingDelegations.length) {
            emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          }
        }
        scheduleDelegation();
      } else if (event.type === "session.delegation.created") {
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          queueDelegation(event);
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(sdp: string, agentId: unknown) {
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    if (typeof agentId !== "string" || !/^[0-9a-f-]{36}$/i.test(agentId)) throw new Error("Support introuvable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent } = await pst(supabaseAdmin).from("pst_agents").select("*").eq("id", agentId).maybeSingle();
    if (!agent) throw new Error("Support introuvable");
    config.agent = agent as AgentRow;
    // Odoo creds come from the owner's shared Laboratory connection.
    const { data: conn } = await supabaseAdmin.from("odoo_connections").select("url, db, username, api_key").eq("user_id", agent.owner_id).maybeSingle();
    if (!conn?.url) throw new Error("Connexion Odoo non configurée");
    config.odoo = { url: conn.url, db: conn.db, login: conn.username, apiKey: conn.api_key };
    startupTimer = setTimeout(() => {
      emit({ type: "app.error", error: { message: "Voice startup timed out" } });
      stop();
    }, 40_000);
    const accepted = await connect(
      new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
      setupAbort.signal,
    );
    if (closing || browser.readyState !== 1) {
      close(accepted);
      return;
    }
    gateway = accepted;
    gateway.onMessage(receiveGateway);
    gateway.onClose(finish);
    gateway.onError(() => {
      emit({ type: "app.error", error: { message: "Voice gateway connection failed" } });
      stop();
    });
    gateway.send(
      JSON.stringify({
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: buildInstructions(config.agent),
          audio: { output: { voice: "marin" } },
          delegation: { type: "client" },
        },
        transport: { type: "webrtc", sdp },
      }),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        starting = true;
        execution.waitUntil(
          startSession(event.sdp, event.agent).catch((error) => {
            if (!closing)
              emit({
                type: "app.error",
                error: { message: error instanceof Error ? error.message : "Voice startup failed" },
              });
            stop();
          }),
        );
        return;
      }
      if (event.type === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      if (gateway.readyState !== 1) return stop();
      gateway.send(data);
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
