/** Real Gmail / Google Sheets synchronisation engine with dedup memory + live run journal. */
import {
  analyzeCvAndInsert, analyzeJobAndInsert, extractDocumentText, rankMatchesForCandidate,
  rankMatchesForJob, stripHtml, type AnyClient,
} from "./hr-core.server";
import { refreshGoogleAccessToken, b64urlDecode } from "./google-refresh.server";

type Kind = "gmail" | "sheets";

class RunLogger {
  private logs: Array<{ t: string; level: string; msg: string }> = [];
  private found = 0; private processed = 0; private skipped = 0;
  private started = Date.now();
  private id: string | null = null;
  constructor(private supabase: AnyClient, private userId: string, private kind: Kind, private trigger: string) {}

  async start() {
    const { data } = await this.supabase.from("fl_cron_runs")
      .insert({ user_id: this.userId, kind: this.kind, trigger: this.trigger, status: "running" })
      .select("id").single();
    this.id = data?.id ?? null;
    return this;
  }
  log(msg: string, level: "info" | "warn" | "error" | "success" = "info") {
    this.logs.push({ t: new Date().toISOString(), level, msg });
    if (this.logs.length > 200) this.logs.shift();
  }
  found_(n = 1) { this.found += n; }
  ok(n = 1) { this.processed += n; }
  skip(n = 1) { this.skipped += n; }
  async flush(status: "running" | "success" | "error" | "skipped", error?: string) {
    if (!this.id) return;
    await this.supabase.from("fl_cron_runs").update({
      status,
      items_found: this.found,
      items_processed: this.processed,
      items_skipped: this.skipped,
      logs: this.logs,
      error: error ?? null,
      duration_ms: Date.now() - this.started,
      finished_at: status === "running" ? null : new Date().toISOString(),
    }).eq("id", this.id);
  }
  get counts() { return { found: this.found, processed: this.processed, skipped: this.skipped }; }
}

function dueNow(lastRun: string | null | undefined, intervalMinutes: number, force: boolean) {
  if (force) return true;
  if (!lastRun) return true;
  return Date.now() - new Date(lastRun).getTime() >= Math.max(1, intervalMinutes) * 60_000;
}

function buildGmailQuery(settings: any) {
  if (settings?.gmail_search_query?.trim()) return settings.gmail_search_query.trim();
  const kws = String(settings?.gmail_keywords || "cv").split(",").map((s: string) => s.trim()).filter(Boolean);
  const or = kws.map((k: string) => `"${k}"`).join(" OR ");
  return `(${or})${settings?.gmail_require_attachment ? " has:attachment" : ""} newer_than:30d`;
}

/* ------------------------------- GMAIL ---------------------------------- */

export async function runGmailSync(
  supabase: AnyClient, userId: string, refreshToken: string,
  opts: { trigger?: string; force?: boolean } = {},
) {
  const trigger = opts.trigger ?? "cron";
  const { data: settings } = await supabase.from("fl_settings").select("*").eq("user_id", userId).maybeSingle();
  if (settings?.email_provider === "sendy") return runSendyInboxSync(supabase, userId, settings, trigger, !!opts.force);
  const enabled = settings?.gmail_cron_enabled !== false && settings?.auto_sync !== false;
  if (!enabled && !opts.force) return { skipped: "désactivé" };
  if (!dueNow(settings?.gmail_last_run_at, settings?.gmail_interval_minutes ?? 15, !!opts.force)) {
    return { skipped: "intervalle non atteint" };
  }

  const run = await new RunLogger(supabase, userId, "gmail", trigger).start();
  await supabase.from("fl_settings").update({ gmail_last_run_at: new Date().toISOString() }).eq("user_id", userId);

  try {
    const q = buildGmailQuery(settings);
    const max = Math.min(Math.max(Number(settings?.gmail_max_per_run) || 10, 1), 50);
    run.log(`Recherche Gmail: ${q} (max ${max})`);
    const token = await refreshGoogleAccessToken(refreshToken);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${max}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!listRes.ok) throw new Error(`Gmail list ${listRes.status}: ${(await listRes.text()).slice(0, 200)}`);
    const list = await listRes.json();
    const messages: Array<{ id: string }> = list.messages ?? [];
    run.log(`${messages.length} message(s) correspondant(s)`);

    for (const m of messages) {
      run.found_();
      const { data: seen } = await supabase.from("fl_processed_emails")
        .select("message_id").eq("user_id", userId).eq("message_id", m.id).maybeSingle();
      if (seen) { run.skip(); run.log(`Déjà traité: ${m.id}`); continue; }

      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (!msgRes.ok) { run.skip(); run.log(`Lecture impossible ${m.id}`, "warn"); continue; }
      const msg = await msgRes.json();
      const headers = msg.payload?.headers ?? [];
      const h = (n: string) => headers.find((x: any) => x.name?.toLowerCase() === n)?.value ?? "";
      const subject = h("subject"); const from = h("from");

      const parts: any[] = [];
      const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts ?? []).forEach(walk); };
      walk(msg.payload);
      const attachments = parts.filter((p) => p.filename && p.body?.attachmentId);

      let cvText = ""; const usedFiles: string[] = [];
      for (const att of attachments.slice(0, 3)) {
        try {
          const aRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}/attachments/${att.body.attachmentId}`,
            { headers: { Authorization: `Bearer ${token}` } });
          if (!aRes.ok) continue;
          const a = await aRes.json();
          const text = await extractDocumentText(b64urlDecode(a.data), att.filename);
          if (text.trim().length > 80) { cvText += `\n\n[${att.filename}]\n${text}`; usedFiles.push(att.filename); }
        } catch (e) { run.log(`Pièce jointe illisible: ${att.filename}`, "warn"); }
      }
      if (!cvText.trim()) {
        const bodyPart = parts.find((p) => p.mimeType === "text/plain" && p.body?.data)
          || parts.find((p) => p.mimeType === "text/html" && p.body?.data);
        if (bodyPart) cvText = stripHtml(new TextDecoder().decode(b64urlDecode(bodyPart.body.data)));
      }
      cvText = cvText.trim();
      if (cvText.length < 80) {
        await supabase.from("fl_processed_emails").insert({ user_id: userId, message_id: m.id });
        run.skip(); run.log(`Contenu trop court, ignoré: "${subject}"`, "warn"); continue;
      }

      try {
        const cand = await analyzeCvAndInsert(supabase, userId, cvText, {
          source: "gmail", sourceRef: m.id, emailFrom: (from.match(/<(.+?)>/)?.[1] ?? from) || undefined,
          fileName: usedFiles[0],
        });
        await supabase.from("fl_processed_emails").insert({ user_id: userId, message_id: m.id });
        run.ok(); run.log(`Candidat créé: ${cand.full_name} (${usedFiles[0] ?? "corps du mail"})`, "success");
        await run.flush("running");
        if (settings?.auto_match !== false) {
          const n = await rankMatchesForCandidate(supabase, userId, cand);
          run.log(`Matching IA sur ${n} poste(s) ouverts`);
        }
      } catch (e: any) {
        run.log(`Échec analyse "${subject}": ${e?.message ?? e}`, "error");
      }
      await run.flush("running");
    }
    await run.flush("success");
    return run.counts;
  } catch (e: any) {
    await run.flush("error", String(e?.message ?? e));
    throw e;
  }
}

/* ------------------------------- SHEETS --------------------------------- */

async function sha1(str: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function runSheetsSync(
  supabase: AnyClient, userId: string, refreshToken: string,
  opts: { trigger?: string; force?: boolean } = {},
) {
  const trigger = opts.trigger ?? "cron";
  const { data: settings } = await supabase.from("fl_settings").select("*").eq("user_id", userId).maybeSingle();
  const enabled = settings?.sheets_cron_enabled !== false && settings?.auto_sync !== false;
  const useSkytab = settings?.spreadsheet_provider === "skytab";
  if (useSkytab && !settings?.skytab_sheet_id) return { skipped: "aucun classeur Sky Tab choisi" };
  if (!useSkytab && !settings?.sheets_spreadsheet_id) return { skipped: "aucun Google Sheet configuré" };
  if (!enabled && !opts.force) return { skipped: "désactivé" };
  if (!dueNow(settings?.sheets_last_run_at, settings?.sheets_interval_minutes ?? 15, !!opts.force)) {
    return { skipped: "intervalle non atteint" };
  }

  const run = await new RunLogger(supabase, userId, "sheets", trigger).start();
  await supabase.from("fl_settings").update({ sheets_last_run_at: new Date().toISOString() }).eq("user_id", userId);

  try {
    const ssid = (useSkytab ? `skytab:${settings.skytab_sheet_id}` : settings.sheets_spreadsheet_id) as string;
    const max = Math.min(Math.max(Number(settings?.sheets_max_per_run) || 10, 1), 50);
    let rows: string[][];
    if (useSkytab) {
      const { data: sheet } = await supabase.from("skytab_sheets").select("name, data_text")
        .eq("id", settings.skytab_sheet_id).eq("user_id", userId).maybeSingle();
      if (!sheet) throw new Error("Classeur Sky Tab introuvable.");
      run.log(`Lecture Sky Tab « ${sheet.name} »`);
      rows = parseCsv(String(sheet.data_text ?? ""));
    } else {
      const range = settings.sheets_range || "A:Z";
      const token = await refreshGoogleAccessToken(refreshToken);
      run.log(`Lecture ${ssid} — plage ${range}`);
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ssid}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Sheets ${r.status}: ${(await r.text()).slice(0, 200)}`);
      rows = (await r.json()).values ?? [];
    }
    if (rows.length < 2) { run.log("Aucune ligne de données"); await run.flush("success"); return run.counts; }

    const header = rows[0].map(String);
    const body = rows.slice(1);
    let done = 0;
    for (let i = 0; i < body.length && done < max; i++) {
      const row = body[i];
      if (!row?.length || row.every((c) => !c)) continue;
      run.found_();
      const hash = await sha1(`${ssid}§${row.join("§")}`);
      const { data: seen } = await supabase.from("fl_processed_sheet_rows")
        .select("row_hash").eq("user_id", userId).eq("spreadsheet_id", ssid).eq("row_hash", hash).maybeSingle();
      if (seen) { run.skip(); continue; }
      const dict = Object.fromEntries(header.map((hh, k) => [hh, row[k] ?? ""]));
      try {
        const job = await analyzeJobAndInsert(supabase, userId, JSON.stringify(dict, null, 2), {
          source: "sheets", sourceRef: `${ssid}#${i + 2}`,
        });
        await supabase.from("fl_processed_sheet_rows").insert({ user_id: userId, spreadsheet_id: ssid, row_hash: hash, row_index: i + 2 });
        run.ok(); done++; run.log(`Poste créé: ${job.title} (ligne ${i + 2})`, "success");
        await run.flush("running");
        if (settings?.auto_match !== false) {
          const n = await rankMatchesForJob(supabase, userId, job);
          run.log(`Matching IA sur ${n} candidat(s) disponibles`);
        }
      } catch (e: any) {
        run.log(`Échec ligne ${i + 2}: ${e?.message ?? e}`, "error");
      }
      await run.flush("running");
    }
    await run.flush("success");
    return run.counts;
  } catch (e: any) {
    await run.flush("error", String(e?.message ?? e));
    throw e;
  }
}

/** Cron entry point: runs for every connected user, honouring their own settings. */
export async function runSyncForAllUsers(kind: Kind) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: google } = await supabaseAdmin
    .from("google_connections").select("user_id, refresh_token");
  const col = kind === "gmail" ? "email_provider" : "spreadsheet_provider";
  const { data: internal } = await supabaseAdmin.from("fl_settings").select("user_id")
    .eq(col, kind === "gmail" ? "sendy" : "skytab");
  const connections: Array<{ user_id: string; refresh_token: string }> = [...(google ?? [])];
  for (const u of internal ?? []) if (!connections.some((c) => c.user_id === u.user_id)) connections.push({ user_id: u.user_id, refresh_token: "" });
  const results: any[] = [];
  for (const c of connections) {
    try {
      const res = kind === "gmail"
        ? await runGmailSync(supabaseAdmin, c.user_id, c.refresh_token, { trigger: "cron" })
        : await runSheetsSync(supabaseAdmin, c.user_id, c.refresh_token, { trigger: "cron" });
      results.push({ user_id: c.user_id, ...res });
    } catch (e: any) {
      results.push({ user_id: c.user_id, error: String(e?.message ?? e) });
    }
  }
  return results;
}

/* ------------------------- INTERNAL SOURCES (Sky Tab / Sendy) ------------------------- */

/** Minimal CSV parser (quotes, commas or semicolons) for Sky Tab sheets. */
export function parseCsv(text: string): string[][] {
  const first = text.split("\n")[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

async function runSendyInboxSync(supabase: AnyClient, userId: string, settings: any, trigger: string, force: boolean) {
  const enabled = settings?.gmail_cron_enabled !== false && settings?.auto_sync !== false;
  if (!enabled && !force) return { skipped: "désactivé" };
  if (!dueNow(settings?.gmail_last_run_at, settings?.gmail_interval_minutes ?? 15, force)) return { skipped: "intervalle non atteint" };
  const run = await new RunLogger(supabase, userId, "gmail", trigger).start();
  await supabase.from("fl_settings").update({ gmail_last_run_at: new Date().toISOString() }).eq("user_id", userId);
  try {
    const kws = String(settings?.gmail_keywords || "cv").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    const max = Math.min(Math.max(Number(settings?.gmail_max_per_run) || 10, 1), 50);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: msgs } = await supabase.from("sendy_mail_messages")
      .select("id, from_address, subject, body_text, body_html").eq("user_id", userId).eq("folder", "inbox")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(200);
    const list = (msgs ?? []).filter((m: any) => {
      const hay = `${m.subject ?? ""} ${m.body_text ?? ""}`.toLowerCase();
      return kws.some((k: string) => hay.includes(k));
    });
    run.log(`Boîte Sendy : ${list.length} message(s) correspondant(s)`);
    let done = 0;
    for (const m of list) {
      if (done >= max) break;
      run.found_();
      const key = `sendy:${m.id}`;
      const { data: seen } = await supabase.from("fl_processed_emails").select("message_id")
        .eq("user_id", userId).eq("message_id", key).maybeSingle();
      if (seen) { run.skip(); continue; }
      const { data: atts } = await supabase.from("sendy_mail_attachments").select("filename, storage_path").eq("message_id", m.id);
      if (settings?.gmail_require_attachment && !atts?.length) { run.skip(); continue; }
      let cvText = ""; const used: string[] = [];
      for (const a of (atts ?? []).slice(0, 3)) {
        try {
          const { data: blob } = await supabase.storage.from("sendy-attachments").download(a.storage_path);
          if (!blob) continue;
          const text = await extractDocumentText(new Uint8Array(await blob.arrayBuffer()), a.filename);
          if (text.trim().length > 80) { cvText += `\n\n[${a.filename}]\n${text}`; used.push(a.filename); }
        } catch { run.log(`Pièce jointe illisible: ${a.filename}`, "warn"); }
      }
      if (!cvText.trim()) cvText = m.body_text || stripHtml(m.body_html ?? "");
      cvText = cvText.trim();
      if (cvText.length < 80) {
        await supabase.from("fl_processed_emails").insert({ user_id: userId, message_id: key });
        run.skip(); continue;
      }
      try {
        const cand = await analyzeCvAndInsert(supabase, userId, cvText, {
          source: "sendy", sourceRef: m.id, emailFrom: m.from_address || undefined, fileName: used[0],
        });
        await supabase.from("fl_processed_emails").insert({ user_id: userId, message_id: key });
        run.ok(); done++; run.log(`Candidat créé: ${cand.full_name}`, "success");
        if (settings?.auto_match !== false) await rankMatchesForCandidate(supabase, userId, cand);
      } catch (e: any) { run.log(`Échec analyse "${m.subject}": ${e?.message ?? e}`, "error"); }
      await run.flush("running");
    }
    await run.flush("success");
    return run.counts;
  } catch (e: any) {
    await run.flush("error", String(e?.message ?? e));
    throw e;
  }
}
