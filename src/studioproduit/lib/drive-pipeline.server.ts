/**
 * Automate Google Drive : détecte les nouvelles photos produit d'un dossier surveillé,
 * lance la série de 5 photos, puis dépose les rendus dans le dossier de destination.
 *
 * Le traitement est volontairement incrémental (quelques rendus par passage) :
 * chaque exécution du cron fait avancer les séances sans jamais dépasser le temps
 * d'exécution d'une requête serveur.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { getAccessToken, updateAccount, type DriveAccount } from "./drive.server";
import { createFolder, downloadFile, listImagesInFolder, uploadFile } from "./google-drive.server";
import { analyzeCore, planCore, renderCore, DEFAULT_SETTINGS, type Settings } from "./pipeline.server";

const RENDERS_PER_RUN = 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabaseAdmin as any;

type Import = {
  id: string;
  user_id: string;
  file_id: string;
  file_name: string | null;
  shoot_id: string | null;
  status: string;
};

async function finishImport(account: DriveAccount, imp: Import, shootId: string) {
  const token = await getAccessToken(account);
  const { data: shots } = await db()
    .from("sp_shots")
    .select("position, image_path")
    .eq("shoot_id", shootId)
    .eq("status", "done")
    .order("position");

  const parentId = account.output_folder_id;
  if (!parentId) throw new Error("Aucun dossier de destination sélectionné.");

  const base = (imp.file_name ?? "produit").replace(/\.[^.]+$/, "");

  // Un sous-dossier dédié par produit, créé dans le dossier de destination choisi.
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", "h");
  const subFolder = await createFolder(token, `${base} — ${stamp}`, parentId);
  const folderId = subFolder.id;

  for (const shot of (shots ?? []) as { position: number; image_path: string }[]) {
    if (!shot.image_path) continue;
    const file = await supabaseAdmin.storage.from("studioproduit-photos").download(shot.image_path);
    if (file.error || !file.data) continue;
    await uploadFile({
      token,
      name: `${base}-photo-${shot.position}.png`,
      parentId: folderId,
      mimeType: "image/png",
      bytes: new Uint8Array(await file.data.arrayBuffer()),
    });
  }

  await db().from("sp_shoots").update({ drive_upload_status: "done", status: "done" }).eq("id", shootId);
  await db().from("sp_drive_imports").update({ status: "done" }).eq("id", imp.id);
}

/**
 * Livre la séance dans Drive dès que ses 5 photos sont prêtes, même quand les rendus
 * ont été relancés à la main depuis la page de résultats.
 */
export async function deliverShootIfComplete(userId: string, shootId: string): Promise<boolean> {
  const { data: imp } = await db()
    .from("sp_drive_imports")
    .select("id, user_id, file_id, file_name, shoot_id, status")
    .eq("user_id", userId)
    .eq("shoot_id", shootId)
    .eq("status", "processing")
    .maybeSingle();
  if (!imp) return false;

  const { count } = await db()
    .from("sp_shots")
    .select("id", { count: "exact", head: true })
    .eq("shoot_id", shootId)
    .neq("status", "done");
  if (count) return false;

  const { getAccount } = await import("./drive.server");
  const account = await getAccount(userId);
  if (!account?.output_folder_id) return false;

  await finishImport(account, imp as Import, shootId);
  return true;
}

/** Fait avancer une séance déjà lancée. Renvoie true si du travail a été fait. */
async function advanceImport(account: DriveAccount, imp: Import): Promise<boolean> {
  if (!imp.shoot_id) return false;
  const { data: pending } = await db()
    .from("sp_shots")
    .select("id")
    .eq("shoot_id", imp.shoot_id)
    .in("status", ["pending", "failed"])
    .order("position")
    .limit(RENDERS_PER_RUN);

  const list = (pending ?? []) as { id: string }[];
  for (const shot of list) {
    try {
      await renderCore(supabaseAdmin, account.user_id, shot.id);
    } catch {
      /* l'erreur est enregistrée sur la photo ; on continue */
    }
  }

  const { count } = await db()
    .from("sp_shots")
    .select("id", { count: "exact", head: true })
    .eq("shoot_id", imp.shoot_id)
    .neq("status", "done");

  if (!count) await finishImport(account, imp, imp.shoot_id);
  return list.length > 0 || !count;
}

/** Détecte et démarre une nouvelle photo produit déposée dans le dossier surveillé. */
async function startNewImport(account: DriveAccount): Promise<boolean> {
  if (!account.watch_folder_id) return false;
  const token = await getAccessToken(account);
  const files = await listImagesInFolder(token, account.watch_folder_id);
  if (files.length === 0) return false;

  const { data: known } = await db()
    .from("sp_drive_imports")
    .select("file_id")
    .eq("user_id", account.user_id)
    .in("file_id", files.map((f) => f.id));
  const seen = new Set(((known ?? []) as { file_id: string }[]).map((k) => k.file_id));

  const next = files.filter((f) => !seen.has(f.id)).pop();
  if (!next) return false;

  const claim = await db()
    .from("sp_drive_imports")
    .insert({
      user_id: account.user_id,
      file_id: next.id,
      file_name: next.name,
      status: "processing",
    })
    .select("id")
    .single();
  if (claim.error) return false;

  try {
    const bytes = await downloadFile(token, next.id);
    const ext = (next.name.split(".").pop() ?? "png").toLowerCase();
    const path = `${account.user_id}/${crypto.randomUUID()}/source.${ext}`;
    const up = await supabaseAdmin.storage
      .from("studioproduit-photos")
      .upload(path, bytes as unknown as ArrayBufferView, {
        contentType: next.mimeType || "image/png",
        upsert: true,
      });
    if (up.error) throw new Error(up.error.message);

    const shoot = await db()
      .from("sp_shoots")
      .insert({
        user_id: account.user_id,
        source_path: path,
        origin: "drive",
        product_name: next.name.replace(/\.[^.]+$/, ""),
        drive_upload_status: "pending",
      })
      .select("id")
      .single();
    if (shoot.error) throw new Error(shoot.error.message);

    await db().from("sp_drive_imports").update({ shoot_id: shoot.data.id }).eq("id", claim.data.id);

    await analyzeCore(supabaseAdmin, shoot.data.id);
    const settings: Settings = { ...DEFAULT_SETTINGS, ...(account.auto_settings ?? {}) };
    await planCore(supabaseAdmin, shoot.data.id, account.user_id, settings);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import Drive impossible.";
    await db()
      .from("sp_drive_imports")
      .update({ status: "failed", error: message })
      .eq("id", claim.data.id);
    throw e;
  }
}

/** Un passage complet pour un compte : on avance l'existant, sinon on démarre du neuf. */
export async function processAccount(account: DriveAccount): Promise<string> {
  try {
    const { data: inflight } = await db()
      .from("sp_drive_imports")
      .select("id, user_id, file_id, file_name, shoot_id, status")
      .eq("user_id", account.user_id)
      .eq("status", "processing")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    let outcome = "rien de nouveau";
    if (inflight) {
      const moved = await advanceImport(account, inflight as Import);
      outcome = moved ? "séance en cours avancée" : "en attente";
    } else if (await startNewImport(account)) {
      outcome = "nouvelle photo produit détectée";
    }

    await updateAccount(account.user_id, {
      last_checked_at: new Date().toISOString(),
      last_error: null,
    });
    return outcome;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur Drive";
    await updateAccount(account.user_id, {
      last_checked_at: new Date().toISOString(),
      last_error: message,
    });
    return `erreur : ${message}`;
  }
}
