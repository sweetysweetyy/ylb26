import { getAccessTokenForUser } from "./google-oauth.server";
import { withRetry } from "./retry.server";

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const GMAIL = "https://gmail.googleapis.com/gmail/v1";

export async function getSheetValues(userId: string, spreadsheetId: string, range: string) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const { value } = await withRetry(async () => {
    const r = await fetch(`${SHEETS}/${spreadsheetId}/values/${range}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Sheets read failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<{ values?: string[][] }>;
  }, { label: "sheets.values.get" });
  return value;
}

export async function getSpreadsheetMeta(userId: string, spreadsheetId: string) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const { value } = await withRetry(async () => {
    const r = await fetch(`${SHEETS}/${spreadsheetId}?fields=properties.title,sheets.properties`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Sheets meta failed: ${r.status}`);
    return r.json() as Promise<{ properties: { title: string }; sheets: Array<{ properties: { title: string; sheetId: number } }> }>;
  }, { label: "sheets.meta" });
  return value;
}

function b64url(s: string) {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendGmail(opts: {
  userId: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}) {
  const { accessToken } = await getAccessTokenForUser(opts.userId);
  const headers: string[] = [
    `From: "${opts.fromName.replace(/"/g, "")}" <${opts.fromEmail}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
  ];
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  const raw = b64url(headers.join("\r\n") + "\r\n\r\n" + opts.body);
  const body: Record<string, string> = { raw };
  if (opts.threadId) body.threadId = opts.threadId;
  const { value } = await withRetry(async () => {
    const r = await fetch(`${GMAIL}/users/me/messages/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Gmail send failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<{ id: string; threadId: string }>;
  }, { label: "gmail.send" });
  return value;
}

export async function listThreadMessages(userId: string, threadId: string) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const { value } = await withRetry(async () => {
    const r = await fetch(`${GMAIL}/users/me/threads/${threadId}?format=full`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Gmail thread failed: ${r.status} ${await r.text()}`);
    return r.json();
  }, { label: "gmail.thread" });
  return value as {
    id: string;
    messages: Array<{
      id: string;
      threadId: string;
      labelIds?: string[];
      payload: { headers: Array<{ name: string; value: string }>; mimeType: string; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string } }> };
      internalDate: string;
    }>;
  };
}

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload: { headers: Array<{ name: string; value: string }>; mimeType: string; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: Array<any> }> };
  internalDate: string;
};

export async function searchMessages(userId: string, query: string, maxResults = 10) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const { value } = await withRetry(async () => {
    const url = `${GMAIL}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Gmail search failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<{ messages?: Array<{ id: string; threadId: string }> }>;
  }, { label: "gmail.search" });
  return value.messages ?? [];
}

export async function getGmailMessage(userId: string, messageId: string) {
  const { accessToken } = await getAccessTokenForUser(userId);
  const { value } = await withRetry(async () => {
    const r = await fetch(`${GMAIL}/users/me/messages/${messageId}?format=full`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) throw new Error(`Gmail message failed: ${r.status} ${await r.text()}`);
    return r.json() as Promise<GmailMessage>;
  }, { label: "gmail.message" });
  return value;
}

export function decodeGmailBody(message: { payload: { mimeType: string; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string } }> } }): string {
  const fromB64 = (d?: string) => (d ? Buffer.from(d.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8") : "");
  const readPart = (part: { mimeType: string; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string }; parts?: Array<any> }> }): string => {
    if (part.body?.data && part.mimeType === "text/plain") return fromB64(part.body.data);
    if (part.parts?.length) {
      const plain = part.parts.map(readPart).find(Boolean);
      if (plain) return plain;
    }
    if (part.body?.data && part.mimeType === "text/html") return fromB64(part.body.data).replace(/<[^>]+>/g, " ");
    return "";
  };
  if (message.payload.body?.data) return fromB64(message.payload.body.data);
  if (message.payload.parts) {
    const text = message.payload.parts.map(readPart).find(Boolean);
    if (text) return text;
  }
  return "";
}

export function getHeader(headers: Array<{ name: string; value: string }>, name: string): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}