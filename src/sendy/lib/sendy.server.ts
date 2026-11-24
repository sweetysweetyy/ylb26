import { sy } from "@/sendy/lib/db";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MailAttachment = { filename: string; contentType: string; base64: string };
export type MailDocLink = { app_source: string; document_id: string; document_number?: string | null };

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Native SKY/Sendy mail sending (Mailgun), shared by SENDYME, TEP boards, Aura, SkyVente and SkyAchat. */
export async function sendSendyMail(
  db: SupabaseClient<any, any, any>,
  userId: string,
  data: { to: string; cc?: string; subject: string; text: string; attachments?: MailAttachment[]; link?: MailDocLink },
): Promise<{ ok: true; messageId: string | null } | { ok: false; error: string }> {
  const apiKey = process.env["MAILGUN_API_KEY"];
  const domain = process.env["MAILGUN_DOMAIN"];
  const base = (process.env["MAILGUN_API_BASE"] || "https://api.mailgun.net").replace(/\/$/, "");
  if (!apiKey || !domain) return { ok: false, error: "Mailgun n'est pas configuré." };

  const { data: mb } = await sy(db).from("sendy_mailboxes").select("local_part, display_name").eq("user_id", userId).maybeSingle();
  if (!mb) return { ok: false, error: "Aucune adresse Sendy réservée. Ouvrez SENDYME pour en créer une." };

  const emailRe = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;
  const split = (s?: string) => (s ?? "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const to = split(data.to);
  const cc = split(data.cc);
  if (!to.length || [...to, ...cc].some((a) => !emailRe.test(a))) return { ok: false, error: "Adresse destinataire invalide." };

  const files = (data.attachments ?? []).map((a) => ({ ...a, bytes: b64ToBytes(a.base64) }));

  const form = new FormData();
  form.append("from", `${String(mb.display_name).replace(/["<>]/g, "")} <${mb.local_part}@${domain}>`);
  to.forEach((t) => form.append("to", t));
  cc.forEach((c) => form.append("cc", c));
  form.append("subject", data.subject || "(sans objet)");
  form.append("text", data.text);
  files.forEach((f) => form.append("attachment", new Blob([f.bytes], { type: f.contentType }), f.filename));

  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`api:${apiKey}`) },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("Mailgun send failed", res.status, body);
    return { ok: false, error: `Mailgun a refusé l'envoi (${res.status}).` };
  }
  let providerId: string | null = null;
  try { providerId = JSON.parse(body).id ?? null; } catch { /* ignore */ }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: msg } = await sy(supabaseAdmin).from("sendy_mail_messages").insert({
    user_id: userId,
    folder: "sent",
    from_address: `${mb.local_part}@${domain}`,
    from_name: mb.display_name,
    to_addresses: to.join(", "),
    cc_addresses: cc.join(", ") || null,
    subject: data.subject || "(sans objet)",
    body_text: data.text,
    provider_message_id: providerId,
    is_read: true,
    app_source: data.link?.app_source ?? null,
    document_id: data.link?.document_id ?? null,
    document_number: data.link?.document_number ?? null,
  }).select("id").single();

  // Keep a copy of each attachment in the user's own folder so it shows in Sendy's sent box.
  if (msg?.id) {
    for (const f of files) {
      const path = `${userId}/sent/${msg.id}/${f.filename.replace(/[^\w.-]/g, "_")}`;
      const up = await supabaseAdmin.storage.from("sendy-attachments").upload(path, f.bytes, { contentType: f.contentType, upsert: true });
      if (up.error) { console.error("attachment upload failed", up.error.message); continue; }
      await sy(supabaseAdmin).from("sendy_mail_attachments").insert({
        user_id: userId, message_id: msg.id, filename: f.filename, content_type: f.contentType, size_bytes: f.bytes.length, storage_path: path,
      });
    }
  }
  return { ok: true, messageId: msg?.id ?? null };
}
