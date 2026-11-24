import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  owned: false,
  reads: [] as Array<{ table: string; filters: Record<string, string> }>,
  writes: [] as Array<{ table: string; operation: string; filters: Record<string, string>; rows?: Array<Record<string, unknown>> }>,
  stream: vi.fn(),
  admin: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: () => () => ({}) }));
vi.mock("@/lib/google-tools.server", () => ({ buildAllTools: vi.fn() }));
vi.mock("@/lib/ai-models.server", () => ({ resolveAppAiModel: async () => "mock-model" }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => {
    state.admin(...args);
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null }) };
    return chain;
  } },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
  from: (table: string) => {
    const filters: Record<string, string> = {};
    const chain = {
      select: () => { state.reads.push({ table, filters }); return chain; },
      eq: (key: string, value: string) => { filters[key] = value; return chain; },
      maybeSingle: async () => ({ data: state.owned ? { id: "thread", title: "Nouvelle conversation" } : null, error: null }),
      insert: async (rows: Array<Record<string, unknown>>) => { state.writes.push({ table, operation: "insert", rows, filters }); return { error: null }; },
      update: () => { state.writes.push({ table, operation: "update", filters }); return chain; },
      then: (resolve: (value: { error: null }) => unknown) => Promise.resolve(resolve({ error: null })),
    };
    return chain;
  },
}) }));
vi.mock("ai", () => ({ streamText: (...args: unknown[]) => state.stream(...args), convertToModelMessages: async (messages: unknown) => messages, stepCountIs: () => ({}) }));

import { Route } from "./chat";
const handler = (Route as unknown as { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } }).server.handlers.POST;

beforeEach(() => {
  state.owned = false; state.reads = []; state.writes = [];
  vi.clearAllMocks();
  vi.stubEnv("LOVABLE_API_KEY", "test-only");
  state.stream.mockImplementation(() => ({ toUIMessageStreamResponse: async (options: {
    originalMessages: Array<Record<string, unknown>>;
    onFinish: (result: { messages: Array<Record<string, unknown>> }) => Promise<void>;
  }) => {
    await options.onFinish({ messages: [...options.originalMessages, { role: "assistant", parts: [{ type: "text", text: "Saved" }] }] });
    return new Response("Saved");
  } }));
});
afterEach(() => vi.unstubAllEnvs());

function request(surface: string) {
  return new Request("https://example.com/api/chat", { method: "POST", headers: { authorization: "Bearer test-session", "content-type": "application/json" }, body: JSON.stringify({ surface, threadId: "thread", messages: [{ role: "user", parts: [{ type: "text", text: "Review my project" }] }] }) });
}

describe.each([
  ["chat", "ocktavus_chat_threads", "ocktavus_chat_messages", "thread_id"],
  ["agent", "mm_agent_conversations", "mm_agent_messages", "conversation_id"],
])("conversation ownership on %s", (surface, threads, messages, threadKey) => {
  it("rejects another owner's conversation before tools or generation", async () => {
    expect((await handler({ request: request(surface) })).status).toBe(404);
    expect(state.reads[0]).toEqual({ table: threads, filters: { id: "thread", user_id: "owner" } });
    expect(state.stream).not.toHaveBeenCalled();
    expect(state.admin).not.toHaveBeenCalled();
    expect(state.writes).toHaveLength(0);
  });
  it("saves both messages and the title through the owner's client", async () => {
    state.owned = true;
    expect((await handler({ request: request(surface) })).status).toBe(200);
    const insert = state.writes.find(write => write.operation === "insert");
    expect(insert?.table).toBe(messages);
    expect(insert?.rows).toHaveLength(2);
    for (const row of insert?.rows ?? []) { expect(row['user_id']).toBe("owner"); expect(row[threadKey]).toBe("thread"); }
    const updates = state.writes.filter(write => write.operation === "update");
    expect(updates).toHaveLength(2);
    for (const update of updates) expect(update.filters).toEqual({ id: "thread", user_id: "owner" });
    expect(state.admin.mock.calls.some(call => call[0] === threads || call[0] === messages)).toBe(false);
  });
});