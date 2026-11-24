import { encryptToken, decryptToken } from "./crypto.server";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export function buildAuthUrl(origin: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID missing");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/pascal-google/callback`,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCode(code: string, origin: string): Promise<TokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/pascal-google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Token exchange failed: ${await r.text()}`);
  return r.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`Token refresh failed: ${await r.text()}`);
  return r.json();
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error("userinfo failed");
  return r.json();
}

/** Uses the Laboratory's shared Google connection (google_connections). */
export async function getAccessTokenForUser(userId: string): Promise<{ accessToken: string; email: string }> {
  const { getValidAccessTokenForUser } = await import("@/lib/google-mm.server");
  const r = await getValidAccessTokenForUser(userId);
  if (!r) throw new Error("Google account not connected");
  return { accessToken: r.token, email: r.email ?? "" };
}

export { encryptToken, decryptToken };
