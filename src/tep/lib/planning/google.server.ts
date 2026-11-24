import { APP_TZ } from "./timezone";
export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
];

async function encKey(): Promise<CryptoKey> {
  const raw = process.env["GOOGLE_TOKEN_ENC_KEY"];
  if (!raw) throw new Error("Chiffrement Google non configuré");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const toB64 = (b: Uint8Array) => { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Format stocké (inchangé) : base64([IV 12o][AuthTag 16o][Ciphertext])
export async function encryptToken(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encKey(), new TextEncoder().encode(plain)));
  const ct = out.subarray(0, out.length - 16), tag = out.subarray(out.length - 16);
  const buf = new Uint8Array(12 + 16 + ct.length);
  buf.set(iv, 0); buf.set(tag, 12); buf.set(ct, 28);
  return toB64(buf);
}

export async function decryptToken(stored: string): Promise<string> {
  const buf = fromB64(stored);
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), ct = buf.subarray(28);
  const joined = new Uint8Array(ct.length + 16);
  joined.set(ct, 0); joined.set(tag, ct.length);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await encKey(), joined);
  return new TextDecoder().decode(pt);
}

export function googleCreds() {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Identifiants Google OAuth manquants");
  return { clientId, clientSecret };
}

export function buildAuthUrl(state: string, redirectUri: string) {
  const { clientId } = googleCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(`Google OAuth: ${json.error_description ?? json.error ?? res.status}`);
  }
  return json;
}

export function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = googleCreds();
  return tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export function refreshAccess(refreshToken: string) {
  const { clientId, clientSecret } = googleCreds();
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
}

export type GoogleConnection = {
  user_id: string;
  google_email: string | null;
  scopes: string;
  refresh_token_ciphertext: string;
  access_token_ciphertext: string | null;
  access_token_expires_at: string | null;
  tasklist_id: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getConnection(userId: string): Promise<GoogleConnection | null> {
  const db = await admin();
  const { data, error } = await db
    .from("tep_planning_google_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as GoogleConnection | null) ?? null;
}

export async function saveConnection(
  userId: string,
  tokens: TokenResponse,
  email: string | null,
  existingRefresh?: string,
) {
  const refresh = tokens.refresh_token ?? existingRefresh;
  if (!refresh) throw new Error("Google n'a pas renvoyé de jeton de rafraîchissement");
  const db = await admin();
  const { error } = await db.from("tep_planning_google_connections").upsert(
    {
      user_id: userId,
      google_email: email,
      scopes: tokens.scope ?? GOOGLE_SCOPES.join(" "),
      refresh_token_ciphertext: await encryptToken(refresh),
      access_token_ciphertext: tokens.access_token ? await encryptToken(tokens.access_token) : null,
      access_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function getAccessToken(userId: string): Promise<string> {
  const conn = await getConnection(userId);
  if (!conn) throw new Error("Compte Google non connecté");

  if (
    conn.access_token_ciphertext &&
    conn.access_token_expires_at &&
    new Date(conn.access_token_expires_at).getTime() > Date.now()
  ) {
    return await decryptToken(conn.access_token_ciphertext);
  }

  const refresh = await decryptToken(conn.refresh_token_ciphertext);
  const tokens = await refreshAccess(refresh);
  const db = await admin();
  await db
    .from("tep_planning_google_connections")
    .update({
      access_token_ciphertext: tokens.access_token ? await encryptToken(tokens.access_token) : null,
      access_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (!tokens.access_token) throw new Error("Jeton Google indisponible");
  return tokens.access_token;
}

export async function gapi<T>(
  userId: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken(userId);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers });
  if (res.status === 204) return {} as T;
  const text = await res.text();
  if (!res.ok) {
    console.error(`Google API ${res.status} ${url}: ${text}`);
    throw new Error(`Google a refusé la requête (${res.status})`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { email?: string };
  return json.email ?? null;
}

export async function ensureTaskList(userId: string): Promise<string> {
  const conn = await getConnection(userId);
  if (conn?.tasklist_id) return conn.tasklist_id;
  const lists = await gapi<{ items?: { id: string }[] }>(
    userId,
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1",
  );
  const id = lists.items?.[0]?.id;
  if (!id) throw new Error("Aucune liste Google Tasks disponible");
  const db = await admin();
  await db.from("tep_planning_google_connections").update({ tasklist_id: id }).eq("user_id", userId);
  return id;
}

export function encodeRawEmail(to: string, subject: string, body: string) {
  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  return Buffer.from(lines, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function eventTimes(day: string, startTime: string | null, durationMin: number | null) {
  if (!startTime) return { start: { date: day }, end: { date: day } };
  const [h = "9", m = "0"] = startTime.split(":");
  const pad = (n: number) => String(n).padStart(2, "0");
  const startISO = `${day}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
  // Arithmétique en heure murale : on part d'un instant fictif UTC, on ajoute la
  // durée, puis on relit les composantes — le fuseau réel est déclaré à Google.
  const startMs = new Date(`${startISO}Z`).getTime();
  const endDate = new Date(startMs + (durationMin ?? 60) * 60_000);
  const endISO = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(
    endDate.getUTCDate(),
  )}T${pad(endDate.getUTCHours())}:${pad(endDate.getUTCMinutes())}:00`;
  return {
    start: { dateTime: startISO, timeZone: APP_TZ },
    end: { dateTime: endISO, timeZone: APP_TZ },
  };
}

