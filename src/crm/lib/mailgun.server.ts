import {
  formatMailgunFrom,
  getEnvMailgunConfig,
  verifyMailgunHmac,
  type MailgunConfig,
} from "@/lib/mailgun.server";

export function mailgunConfigured(config?: MailgunConfig | null) {
  const cfg = config ?? getEnvMailgunConfig();
  return !!(cfg?.apiKey && cfg?.domain);
}

export async function sendMailgunEmail(opts: {
  to: string;
  subject: string;
  text: string;
  oppId: string;
  config?: MailgunConfig | null;
}) {
  const cfg = opts.config ?? getEnvMailgunConfig();
  if (!cfg) throw new Error("Mailgun n'est pas configuré.");
  const from = formatMailgunFrom(cfg, "crm", "Nova CRM");
  const form = new FormData();
  form.set("from", from);
  form.set("to", opts.to);
  form.set("subject", opts.subject);
  form.set("text", opts.text);
  form.set("v:opportunity_id", opts.oppId);
  const res = await fetch(`${cfg.apiBase}/v3/${cfg.domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${cfg.apiKey}`)}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Envoi email échoué (${res.status}) : ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { id?: string };
  return { id: j.id ?? null };
}

export async function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey?: string | null,
) {
  const key = signingKey ?? process.env["MAILGUN_WEBHOOK_SIGNING_KEY"] ?? "";
  return verifyMailgunHmac(key, timestamp, token, signature);
}
