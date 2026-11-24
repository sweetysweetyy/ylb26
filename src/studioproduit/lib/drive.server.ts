/** Accès serveur au compte Google Drive relié d'un utilisateur. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { refreshAccessToken } from "./google-drive.server";
import type { Settings } from "./pipeline.server";

export type DriveAccount = {
  user_id: string;
  google_email: string | null;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  watch_folder_id: string | null;
  watch_folder_name: string | null;
  output_folder_id: string | null;
  output_folder_name: string | null;
  auto_enabled: boolean;
  auto_settings: Partial<Settings>;
  last_checked_at: string | null;
  last_error: string | null;
};

const table = () => (supabaseAdmin as never as { from: (t: string) => any }).from("sp_drive_accounts");

export async function getAccount(userId: string): Promise<DriveAccount | null> {
  const { data } = await table().select("*").eq("user_id", userId).maybeSingle();
  return (data as DriveAccount | null) ?? null;
}

export async function listEnabledAccounts(limit = 5): Promise<DriveAccount[]> {
  const { data } = await table()
    .select("*")
    .eq("auto_enabled", true)
    .not("watch_folder_id", "is", null)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  return (data as DriveAccount[] | null) ?? [];
}

export async function updateAccount(userId: string, patch: Record<string, unknown>) {
  await table().update(patch).eq("user_id", userId);
}

/** Renvoie un jeton d'accès valide, en le rafraîchissant et le mettant en cache si besoin. */
export async function getAccessToken(account: DriveAccount): Promise<string> {
  const expiry = account.access_token_expires_at
    ? new Date(account.access_token_expires_at).getTime()
    : 0;
  if (account.access_token && expiry - Date.now() > 60_000) return account.access_token;

  const tokens = await refreshAccessToken(account.refresh_token);
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  await updateAccount(account.user_id, {
    access_token: tokens.access_token,
    access_token_expires_at: expiresAt,
  });
  account.access_token = tokens.access_token;
  account.access_token_expires_at = expiresAt;
  return tokens.access_token;
}
