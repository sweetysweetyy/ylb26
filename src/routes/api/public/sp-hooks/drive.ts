/** Déclencheur planifié : fait avancer l'automate Google Drive de chaque compte actif. */
import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/studioproduit/lib/cron-auth.server";

/** Le planificateur envoie le jeton dédié ; on garde la clé Lovable en secours. */
async function authenticate(request: Request): Promise<Response | null> {
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const expected = process.env["DRIVE_CRON_TOKEN"];
  if (token && expected && token === expected) return null;
  return authenticateCronRequest(request);
}

async function run() {
  const { listEnabledAccounts } = await import("@/studioproduit/lib/drive.server");
  const { processAccount } = await import("@/studioproduit/lib/drive-pipeline.server");
  const accounts = await listEnabledAccounts(5);
  const results: { user: string; outcome: string }[] = [];
  for (const account of accounts) {
    if (!account.watch_folder_id || !account.output_folder_id) continue;
    results.push({ user: account.user_id, outcome: await processAccount(account) });
  }
  return Response.json({ checked: results.length, results });
}

export const Route = createFileRoute("/api/public/sp-hooks/drive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticate(request);
        if (denied) return denied;
        return run();
      },
      GET: async ({ request }) => {
        const denied = await authenticate(request);
        if (denied) return denied;
        return run();
      },
    },
  },
});
