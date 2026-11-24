import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { signOAuthState, verifyOAuthState } from "./google.server";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("Google account link verification", () => {
  it.each(["/api/google/callback", "/api/public/pa-google/callback", "/api/public/feeloo-google/callback"])("authenticates the owner and destination for %s", async ret => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-signing-secret");
    const state = await signOAuthState({ uid: "original-owner", ret });
    expect(await verifyOAuthState(state)).toMatchObject({ uid: "original-owner", ret });
    const [body, signature] = state.split(".");
    if (!body || !signature) throw new Error("Missing test state");
    const forged = btoa(JSON.stringify({ uid: "victim", ret, t: Date.now() })).replace(/=+$/, "");
    await expect(verifyOAuthState(`${forged}.${signature}`)).rejects.toThrow();
    await expect(verifyOAuthState("victim-user-id")).rejects.toThrow();
  });
  it("rejects expired signed account links", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-signing-secret");
    vi.useFakeTimers();
    const state = await signOAuthState({ uid: "owner", ret: "/api/google/callback" });
    vi.advanceTimersByTime(16 * 60_000);
    await expect(verifyOAuthState(state)).rejects.toThrow();
  });
});