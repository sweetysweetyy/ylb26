import { createFileRoute } from "@tanstack/react-router";
import PostalMime from "postal-mime";
import { findMailgunConfigsByDomains, verifyMailgunHmac } from "@/lib/mailgun.server";

function addresses(s: string) {
  return (s.match(/[^\s<>,;"]+@[^\s<>,;"]+/g) ?? []).map((a) => a.toLowerCase());
}

export const Route = createFileRoute("/api/public/mailgun/mime")({
  server: {
    handlers: {
      GET: async () => new Response("Nova Mail inbound endpoint OK"),
      POST: async ({ request }) => {
        const form = await request.formData();
        const ts = String(form.get("timestamp") ?? "");
        const token = String(form.get("token") ?? "");
        const sig = String(form.get("signature") ?? "");
        if (!ts || !token || !sig) return new Response("Invalid signature", { status: 401 });

        const allRecipients = addresses(String(form.get("recipient") ?? form.get("To") ?? ""));
        const domains = allRecipients.map((a) => a.split("@")[1] ?? "").filter(Boolean);
        const candidates = await findMailgunConfigsByDomains(domains);
        if (!candidates.length) return new Response("Not configured", { status: 500 });

        let matched: (typeof candidates)[number] | null = null;
        for (const c of candidates) {
          if (c.config.signingKey && (await verifyMailgunHmac(c.config.signingKey, ts, token, sig))) {
            matched = c;
            break;
          }
        }
        if (!matched)
          return new Response("Invalid signature", { status: 401 });

        const domain = matched.config.domain.toLowerCase();

        const rawMime = form.get("body-mime");
        const raw = typeof rawMime === "string" ? rawMime : null;
        const parsed = raw ? await PostalMime.parse(raw) : null;

        const recipients = allRecipients.filter((a) => a.endsWith("@" + domain));
        const locals = [...new Set(recipients.map((a) => a.split("@")[0] ?? ""))];
        if (!locals.length) return new Response("No local recipient", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: boxes } = await supabaseAdmin.from("sendy_mailboxes").select("user_id, local_part").in("local_part", locals);
        const targetUserIds = new Set<string>((boxes ?? []).map((b) => b.user_id));
        if (targetUserIds.size === 0 && matched.userId) targetUserIds.add(matched.userId);
        if (targetUserIds.size === 0) return new Response("Unknown recipient", { status: 406 });

        const fromHeader = String(form.get("from") ?? form.get("From") ?? form.get("sender") ?? "");
        const fromAddr = parsed?.from?.address ?? addresses(fromHeader)[0] ?? "";
        const fromName = parsed?.from?.name || fromHeader.replace(/<.*>/, "").replace(/"/g, "").trim() || fromAddr;
        const subject = parsed?.subject ?? String(form.get("subject") ?? "");
        const text = parsed?.text ?? String(form.get("body-plain") ?? form.get("stripped-text") ?? "");
        const html = parsed?.html ?? (form.get("body-html") ? String(form.get("body-html")) : null);
        const to = String(form.get("To") ?? form.get("recipient") ?? "");
        const cc = form.get("Cc") ? String(form.get("Cc")) : null;
        const isPriority = /urgent|important|asap|priorit/i.test(subject) ||
          String(form.get("X-Priority") ?? "").startsWith("1");

        // collect attachments from MIME or multipart fields
        const files: { name: string; type: string; data: Uint8Array }[] = [];
        if (parsed) {
          for (const a of parsed.attachments) {
            const d = typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content as ArrayBuffer);
            files.push({ name: a.filename || "piece-jointe", type: a.mimeType, data: d });
          }
        } else {
          for (const [k, v] of form.entries()) {
            if (k.startsWith("attachment") && v instanceof File)
              files.push({ name: v.name, type: v.type, data: new Uint8Array(await v.arrayBuffer()) });
          }
        }

        for (const userId of targetUserIds) {
          const { data: msg, error } = await supabaseAdmin.from("sendy_mail_messages").insert({
            user_id: userId,
            folder: "inbox",
            from_address: fromAddr,
            from_name: fromName,
            to_addresses: to,
            cc_addresses: cc,
            subject,
            body_text: text,
            body_html: html,
            raw_mime: raw,
            provider_message_id: parsed?.messageId ?? String(form.get("Message-Id") ?? ""),
            is_priority: isPriority,
          }).select("id").single();
          if (error || !msg) { console.error("insert failed", error); return new Response("DB error", { status: 500 }); }
          for (const f of files) {
            const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
            const path = `${userId}/${msg.id}/${crypto.randomUUID()}-${safe}`;
            const up = await supabaseAdmin.storage.from("sendy-attachments").upload(path, f.data, { contentType: f.type || "application/octet-stream" });
            if (up.error) { console.error("upload failed", up.error); continue; }
            await supabaseAdmin.from("sendy_mail_attachments").insert({
              message_id: msg.id, user_id: userId, filename: f.name, content_type: f.type, size_bytes: f.data.byteLength, storage_path: path,
            });
          }
        }
        return new Response("OK");
      },
    },
  },
});
