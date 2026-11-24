import type { Ctx } from "./assistant-apps.server";

/** Never accept arbitrary buckets or URLs from an agent: resolve an owned Sky Cloud row. */
export async function readSource(ctx: Ctx, fileId: string, kind: "pdf" | "image" | "text") {
  const { data: row, error } = await ctx.db.from("skycloud_files")
    .select("id,name,storage_path,mime_type,encrypted,size")
    .eq("id", fileId).eq("user_id", ctx.userId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Fichier source introuvable dans votre Sky Cloud.");
  if (row.encrypted) throw new Error("Ce fichier est chiffré. Dans Sky Cloud, choisissez « Rendre lisible par les agents ».");
  if (!row.storage_path.startsWith(`${ctx.userId}/`) || row.storage_path.split("/").some((p: string) => p === ".." || p === ".")) {
    throw new Error("Chemin de fichier source non autorisé.");
  }
  const mime = row.mime_type ?? "";
  if (kind === "pdf" && mime !== "application/pdf" && !row.name.toLowerCase().endsWith(".pdf")) throw new Error("Une vraie facture ou un document PDF est requis.");
  if (kind === "image" && !["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new Error("Une photo PNG, JPEG ou WebP est requise.");
  if (kind === "text" && !mime.startsWith("text/") && !/\.(csv|txt|md|json)$/i.test(row.name)) throw new Error("Utilisez un fichier CSV, TXT, Markdown ou JSON, ou transmettez le texte extrait par une action précédente.");
  const { data: blob, error: downloadError } = await ctx.db.storage.from("skycloud-files").download(row.storage_path);
  if (downloadError || !blob) throw new Error("Impossible de lire le fichier source.");
  return { id: row.id as string, name: row.name as string, mime, blob };
}

export async function sourceText(ctx: Ctx, input: { source_file_id?: string; contenu_source?: string }) {
  if (input.source_file_id) return (await (await readSource(ctx, input.source_file_id, "text")).blob.text());
  if (input.contenu_source?.trim()) return input.contenu_source;
  throw new Error("Précisez un fichier source Sky Cloud ou un contenu extrait d'une autre application.");
}

export async function copySource(ctx: Ctx, source: Awaited<ReturnType<typeof readSource>>, bucket: string, path: string) {
  const { error } = await ctx.db.storage.from(bucket).upload(path, source.blob, { contentType: source.mime || "application/octet-stream", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function owned(ctx: Ctx, table: string, id: string) {
  const { data, error } = await ctx.db.from(table).select("*").eq("id", id).eq("user_id", ctx.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Élément introuvable dans votre compte.");
  return data;
}

export async function insertOwned(ctx: Ctx, table: string, values: Record<string, unknown>) {
  const { data, error } = await ctx.db.from(table).insert({ ...values, user_id: ctx.userId }).select("*").single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Enregistrement impossible.");
  return data;
}