/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MailgunConfig = {
  apiKey: string;
  domain: string;
  signingKey: string | null;
  apiBase: string;
  fromName: string | null;
  fromEmail: string | null;
  source: "user" | "env";
};

export function normalizeApiBase(raw?: string | null): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (trimmed) return trimmed;
  return (process.env["MAILGUN_REGION"] ?? "").toLowerCase() === "eu"
    ? "https://api.eu.mailgun.net"
    : "https://api.mailgun.net";
}

export function getEnvMailgunConfig(): MailgunConfig | null {
  const apiKey = process.env["MAILGUN_API_KEY"]?.trim();
  const domain = process.env["MAILGUN_DOMAIN"]?.trim();
  if (!apiKey || !domain) return null;
  const rawFrom = process.env["MAILGUN_FROM"]?.trim() || null;
  return {
    apiKey,
    domain,
    signingKey: process.env["MAILGUN_WEBHOOK_SIGNING_KEY"]?.trim() || null,
    apiBase: normalizeApiBase(process.env["MAILGUN_API_BASE"]),
    fromName: null,
    fromEmail: rawFrom,
    source: "env",
  };
}

export async function getUserMailgunConfig(
  db: SupabaseClient<any, any, any>,
  userId: string,
): Promise<MailgunConfig | null> {
  const { data } = await (db as any)
    .from("mailgun_connections")
    .select("api_key, domain, signing_key, api_base, from_name, from_email")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.api_key && data?.domain) {
    return {
      apiKey: String(data.api_key).trim(),
      domain: String(data.domain).trim(),
      signingKey: data.signing_key ? String(data.signing_key).trim() : null,
      apiBase: normalizeApiBase(data.api_base),
      fromName: data.from_name ? String(data.from_name).trim() : null,
      fromEmail: data.from_email ? String(data.from_email).trim() : null,
      source: "user",
    };
  }
  return getEnvMailgunConfig();
}

export async function findMailgunConfigsByDomains(
  domains: string[],
): Promise<Array<{ userId: string | null; config: MailgunConfig }>> {
  const unique = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))];
  const results: Array<{ userId: string | null; config: MailgunConfig }> = [];

  if (unique.length > 0) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("mailgun_connections")
      .select("user_id, api_key, domain, signing_key, api_base, from_name, from_email")
      .in("domain", unique);

    for (const row of data ?? []) {
      if (row.domain) {
        results.push({
          userId: row.user_id,
          config: {
            apiKey: String(row.api_key ?? "").trim(),
            domain: String(row.domain).trim().toLowerCase(),
            signingKey: row.signing_key ? String(row.signing_key).trim() : null,
            apiBase: normalizeApiBase(row.api_base),
            fromName: row.from_name ? String(row.from_name).trim() : null,
            fromEmail: row.from_email ? String(row.from_email).trim() : null,
            source: "user",
          },
        });
      }
    }
  }

  const env = getEnvMailgunConfig();
  if (env && (unique.length === 0 || unique.includes(env.domain.toLowerCase()))) {
    results.push({ userId: null, config: env });
  }
  return results;
}

export async function verifyMailgunHmac(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string,
): Promise<boolean> {
  if (!signingKey || !timestamp || !token || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 900) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(timestamp + token)));
  const hex = Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function formatMailgunFrom(config: MailgunConfig, fallbackLocal = "crm", fallbackName = "Nova CRM"): string {
  if (config.fromEmail) {
    if (config.fromEmail.includes("<")) return config.fromEmail;
    const name = (config.fromName || fallbackName).replace(/["<>]/g, "").trim();
    return name ? `${name} <${config.fromEmail}>` : config.fromEmail;
  }
  const name = (config.fromName || fallbackName).replace(/["<>]/g, "").trim();
  return `${name} <${fallbackLocal}@${config.domain}>`;
}