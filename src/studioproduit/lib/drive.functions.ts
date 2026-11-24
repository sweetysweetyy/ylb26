import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { Settings } from "./pipeline.server";

export type DriveStatus = {
  connected: boolean;
  email: string | null;
  watchFolder: { id: string; name: string } | null;
  outputFolder: { id: string; name: string } | null;
  autoEnabled: boolean;
  settings: Partial<Settings>;
  lastCheckedAt: string | null;
  lastError: string | null;
  redirectUri: string;
};

function originOf() {
  const req = getRequest();
  return new URL(req.url).origin;
}

export const getDriveStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriveStatus> => {
    const { getAccount } = await import("./drive.server");
    const { DRIVE_CALLBACK_PATH } = await import("./google-drive.server");
    const account = await getAccount(context.userId);
    const redirectUri = originOf() + DRIVE_CALLBACK_PATH;
    if (!account) {
      return {
        connected: false,
        email: null,
        watchFolder: null,
        outputFolder: null,
        autoEnabled: false,
        settings: {},
        lastCheckedAt: null,
        lastError: null,
        redirectUri,
      };
    }
    return {
      connected: true,
      email: account.google_email,
      watchFolder: account.watch_folder_id
        ? { id: account.watch_folder_id, name: account.watch_folder_name ?? "Dossier" }
        : null,
      outputFolder: account.output_folder_id
        ? { id: account.output_folder_id, name: account.output_folder_name ?? "Dossier" }
        : null,
      autoEnabled: account.auto_enabled,
      settings: account.auto_settings ?? {},
      lastCheckedAt: account.last_checked_at,
      lastError: account.last_error,
      redirectUri,
    };
  });

/** Prépare l'URL de consentement Google (jeton d'état à usage unique). */
export const startDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildAuthUrl } = await import("./google-drive.server");
    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    await admin.from("sp_oauth_states").delete().eq("user_id", context.userId);
    const ins = await admin.from("sp_oauth_states").insert({ state, user_id: context.userId });
    if (ins.error) throw new Error(ins.error.message);
    return { url: buildAuthUrl(originOf(), state) };
  });

export const listDriveFolders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string }) => input)
  .handler(async ({ data, context }) => {
    const { getAccount, getAccessToken } = await import("./drive.server");
    const { listFolders } = await import("./google-drive.server");
    const account = await getAccount(context.userId);
    if (!account) throw new Error("Google Drive n'est pas connecté.");
    const token = await getAccessToken(account);
    return listFolders(token, data.query);
  });

export const createDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data, context }) => {
    const { getAccount, getAccessToken } = await import("./drive.server");
    const { createFolder } = await import("./google-drive.server");
    const account = await getAccount(context.userId);
    if (!account) throw new Error("Google Drive n'est pas connecté.");
    const token = await getAccessToken(account);
    return createFolder(token, data.name.trim() || "Studio Produit");
  });

export const saveDriveConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      watchFolder?: { id: string; name: string } | null;
      outputFolder?: { id: string; name: string } | null;
      autoEnabled?: boolean;
      settings?: Partial<Settings>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getAccount, updateAccount } = await import("./drive.server");
    const account = await getAccount(context.userId);
    if (!account) throw new Error("Google Drive n'est pas connecté.");

    const patch: Record<string, unknown> = {};
    if (data.watchFolder !== undefined) {
      patch["watch_folder_id"] = data.watchFolder?.id ?? null;
      patch["watch_folder_name"] = data.watchFolder?.name ?? null;
    }
    if (data.outputFolder !== undefined) {
      patch["output_folder_id"] = data.outputFolder?.id ?? null;
      patch["output_folder_name"] = data.outputFolder?.name ?? null;
    }
    if (data.settings !== undefined) patch["auto_settings"] = data.settings;
    if (data.autoEnabled !== undefined) {
      const watch = data.watchFolder?.id ?? account.watch_folder_id;
      const out = data.outputFolder?.id ?? account.output_folder_id;
      if (data.autoEnabled && (!watch || !out)) {
        throw new Error("Choisissez le dossier surveillé et le dossier de destination.");
      }
      patch["auto_enabled"] = data.autoEnabled;
    }
    await updateAccount(context.userId, patch);
    return { ok: true };
  });

export const disconnectDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("sp_drive_accounts").delete().eq("user_id", context.userId);
    return { ok: true };
  });

/** Lance immédiatement un passage de l'automate pour l'utilisateur connecté. */
export const runDriveNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccount } = await import("./drive.server");
    const { processAccount } = await import("./drive-pipeline.server");
    const account = await getAccount(context.userId);
    if (!account) throw new Error("Google Drive n'est pas connecté.");
    if (!account.watch_folder_id || !account.output_folder_id) {
      throw new Error("Choisissez le dossier surveillé et le dossier de destination.");
    }
    return { outcome: await processAccount(account) };
  });

export const listDriveImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("sp_drive_imports")
      .select("id, file_name, status, shoot_id, error, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });
