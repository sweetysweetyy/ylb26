/** Gmail + Calendar helpers for Prospect Engine. Server-only.
 * Tokens come from the Laboratory's shared Google connection (Settings → Google). */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Returns a valid access token from the shared Laboratory Google connection, refreshing it when needed. */
export async function getUserAccessToken(userId: string): Promise<{ token: string; email: string | null }> {
  const { getValidAccessTokenForUser } = await import("@/lib/google-mm.server");
  const result = await getValidAccessTokenForUser(userId);
  if (!result) throw new Error("Google non connecté : reliez votre compte dans Paramètres du Laboratoire → Google.");
  return result;
}

function base64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export async function sendGmail(opts: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
  ];
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`, `References: ${opts.references ?? opts.inReplyTo}`);
  const raw = base64Url(`${headers.join("\r\n")}\r\n\r\n${opts.body}`);

  const response = await fetch(`${GMAIL}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts.threadId ? { raw, threadId: opts.threadId } : { raw }),
  });
  const payload = (await response.json()) as { id?: string; threadId?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(`Envoi Gmail échoué: ${payload.error?.message ?? response.status}`);
  return payload;
}

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  body: string;
  labelIds: string[];
};

type RawPart = { mimeType?: string; body?: { data?: string }; parts?: RawPart[] };

function extractBody(part: RawPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  if (part.parts) {
    for (const child of part.parts) {
      const text = extractBody(child);
      if (text) return text;
    }
  }
  if (part.body?.data) return decodeBase64Url(part.body.data);
  return "";
}

export async function getGmailThread(accessToken: string, threadId: string): Promise<GmailMessage[]> {
  const response = await fetch(`${GMAIL}/threads/${threadId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    messages?: Array<{
      id: string;
      threadId: string;
      labelIds?: string[];
      internalDate?: string;
      payload?: RawPart & { headers?: Array<{ name: string; value: string }> };
    }>;
  };
  return (payload.messages ?? []).map((message) => {
    const headers = message.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
    return {
      id: message.id,
      threadId: message.threadId,
      from: header("From"),
      to: header("To"),
      subject: header("Subject"),
      date: header("Date") || new Date(Number(message.internalDate ?? Date.now())).toISOString(),
      messageId: header("Message-ID"),
      body: extractBody(message.payload).slice(0, 8000),
      labelIds: message.labelIds ?? [],
    };
  });
}

export async function listCalendarBusy(accessToken: string, days = 10) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400000);
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: "primary" }],
    }),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    calendars?: { primary?: { busy?: Array<{ start: string; end: string }> } };
  };
  return payload.calendars?.primary?.busy ?? [];
}
