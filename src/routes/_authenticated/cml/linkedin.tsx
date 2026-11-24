import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  publishToLinkedIn, refreshAllAnalytics, fetchLinkedInAnalytics,
  enqueuePosts, processNextJob, retryJob, cancelJob,
} from "@/cml/lib/linkedin.functions";
import { toast } from "sonner";
import {
  Linkedin, Send, RefreshCw, Heart, MessageCircle, ExternalLink, Loader2,
  BarChart3, Eye, MousePointerClick, Share2, ListChecks, RotateCcw, XCircle,
  CheckCircle2, AlertTriangle, ScrollText, Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/_authenticated/cml/linkedin")({
  component: LinkedInPage,
  head: () => ({
    meta: [
      { title: "Publication & Analytics LinkedIn | Holo CM" },
      { name: "description", content: "Publie en lot sur LinkedIn, suis la file d'attente, les vues, clics et l'engagement réel de chaque post." },
      { property: "og:title", content: "Publication & Analytics LinkedIn" },
      { property: "og:description", content: "File de publication, journal d'exécution et métriques détaillées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LinkedInPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const pub = useServerFn(publishToLinkedIn);
  const refresh = useServerFn(refreshAllAnalytics);
  const one = useServerFn(fetchLinkedInAnalytics);
  const enqueue = useServerFn(enqueuePosts);
  const next = useServerFn(processNextJob);
  const retry = useServerFn(retryJob);
  const cancel = useServerFn(cancelJob);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    const [{ data: p }, { data: s }, { data: j }, { data: l }] = await Promise.all([
      supabase.from("cml_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("cml_settings").select("*").eq("user_id", u.user!.id).maybeSingle(),
      supabase.from("cml_publish_jobs").select("*, posts(title, hook)").order("created_at", { ascending: false }).limit(40),
      supabase.from("cml_publish_logs").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setPosts(p ?? []);
    setSettings(s);
    setJobs(j ?? []);
    setLogs(l ?? []);
  }
  useEffect(() => { load(); }, []);

  // Rafraîchissement auto quand une file tourne
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running]);

  async function publish(id: string) {
    setBusy(id);
    try {
      const r: any = await pub({ data: { postId: id } });
      toast.success(r?.withImage ? "Publié avec le visuel 🚀" : "Publié sur LinkedIn 🚀");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function refreshAll() {
    setBusy("all");
    try { const r = await refresh({}); toast.success(`${r.updated} post(s) rafraîchi(s)`); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function refreshOne(id: string) {
    setBusy(id);
    try { await one({ data: { postId: id } }); await load(); toast.success("Stats mises à jour"); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  async function runBatch(spacing: number) {
    if (!selectedIds.length) { toast.error("Sélectionne au moins un post"); return; }
    setRunning(true);
    try {
      const r = await enqueue({ data: { postIds: selectedIds, spacingMinutes: spacing } });
      toast.success(`${r.queued} post(s) ajoutés à la file`);
      setSelected({});
      await load();
      // Traitement séquentiel avec progression
      for (let i = 0; i < r.queued + 5; i++) {
        const res: any = await next({});
        await load();
        if (res.done) break;
      }
      toast.success("File traitée ✅");
    } catch (e: any) { toast.error(e.message); }
    finally { setRunning(false); await load(); }
  }

  async function drainQueue() {
    setRunning(true);
    try {
      for (let i = 0; i < 30; i++) {
        const res: any = await next({});
        await load();
        if (res.done) break;
      }
      toast.success("File traitée");
    } catch (e: any) { toast.error(e.message); }
    finally { setRunning(false); }
  }

  const drafts = posts.filter((p) => p.status === "draft");
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const published = posts.filter((p) => p.status === "published");

  const totals = useMemo(() => published.reduce((acc, p) => {
    const a = p.analytics ?? {};
    acc.likes += a.likes ?? 0;
    acc.comments += a.comments ?? 0;
    acc.shares += a.shares ?? 0;
    acc.clicks += a.clicks ?? 0;
    acc.views += a.impressions || a.impressions_estimated || 0;
    return acc;
  }, { likes: 0, comments: 0, shares: 0, clicks: 0, views: 0 }), [published]);

  const engagementRate = totals.views
    ? Math.round(((totals.likes + totals.comments + totals.shares) / totals.views) * 10000) / 100
    : 0;

  const activeJobs = jobs.filter((j) => ["queued", "retry", "processing"].includes(j.status));
  const failedJobs = jobs.filter((j) => j.status === "failed");
  const doneJobs = jobs.filter((j) => j.status === "success");
  const progress = jobs.length ? Math.round((doneJobs.length / (doneJobs.length + activeJobs.length || 1)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">LinkedIn</div>
          <h1 className="mt-1 font-display text-4xl font-semibold">Publication <span className="cml-text-holo">& Analytics</span></h1>
          <p className="mt-1 text-muted-foreground text-sm">Publication en lot, file d'attente sécurisée, métriques réelles par post.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLogs(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            <ScrollText className="h-4 w-4" /> Journal
          </button>
          <button onClick={refreshAll} disabled={busy === "all"}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Rafraîchir stats
          </button>
        </div>
      </div>

      {!settings?.linkedin_connected && (
        <div className="cml-bento p-5 border border-holo/30">
          <p className="text-sm">LinkedIn n'est pas encore connecté. <Link to="/cml/settings" className="cml-text-holo underline">Connecte-le dans les paramètres →</Link></p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Publiés" value={published.length} />
        <Stat label="Planifiés" value={scheduled.length} />
        <Stat label="Vues" value={totals.views} icon={<Eye className="h-4 w-4" />} />
        <Stat label="Clics" value={totals.clicks} icon={<MousePointerClick className="h-4 w-4" />} />
        <Stat label="Likes" value={totals.likes} icon={<Heart className="h-4 w-4" />} />
        <Stat label="Engagement" value={engagementRate} suffix="%" icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* ============ FILE DE PUBLICATION ============ */}
      <div className="cml-bento p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">File de publication</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">{activeJobs.length} en attente</span>
            <span className="rounded-full bg-white/10 px-3 py-1">{doneJobs.length} réussis</span>
            {failedJobs.length > 0 && <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-300">{failedJobs.length} échoués</span>}
            <button onClick={drainQueue} disabled={running || !activeJobs.length}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10 disabled:opacity-40">
              {running ? "Traitement…" : "Traiter la file"}
            </button>
          </div>
        </div>

        {(activeJobs.length > 0 || running) && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full cml-bg-holo" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {jobs.slice(0, 12).map((j) => (
            <motion.div key={j.id} layout className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-sm">
              <StatusDot status={j.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate">{j.posts?.title ?? j.posts?.hook ?? "Post"}</div>
                {j.last_error && <div className="truncate text-[11px] text-red-300">{j.last_error}</div>}
              </div>
              <span className="text-[11px] text-muted-foreground">tentative {j.attempts}/{j.max_attempts}</span>
              {["failed", "cancelled"].includes(j.status) && (
                <button onClick={async () => { await retry({ data: { jobId: j.id } }); await load(); toast.success("Job relancé"); }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] hover:bg-white/10">
                  <RotateCcw className="h-3 w-3" /> Réessayer
                </button>
              )}
              {["queued", "retry", "processing"].includes(j.status) && (
                <button onClick={async () => { await cancel({ data: { jobId: j.id } }); await load(); toast("Job annulé"); }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] hover:bg-white/10">
                  <XCircle className="h-3 w-3" /> Annuler
                </button>
              )}
            </motion.div>
          ))}
          {jobs.length === 0 && <div className="text-xs text-muted-foreground">Aucun job. Sélectionne des brouillons ci-dessous pour lancer une publication en lot.</div>}
        </div>
      </div>

      {/* ============ BROUILLONS + BATCH ============ */}
      <div className="cml-bento p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">Brouillons à publier</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button onClick={() => setSelected(Object.fromEntries(drafts.map((d) => [d.id, true])))}
              className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">Tout sélectionner</button>
            <button onClick={() => setSelected({})} className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">Effacer</button>
            <button onClick={() => runBatch(0)} disabled={running || !selectedIds.length}
              className="rounded-full cml-bg-holo px-4 py-1.5 font-semibold text-primary-foreground cml-ring-holo disabled:opacity-40">
              Publier {selectedIds.length || ""} en lot
            </button>
            <button onClick={() => runBatch(30)} disabled={running || !selectedIds.length}
              className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10 disabled:opacity-40">
              Espacer 30 min
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {drafts.length === 0 && <div className="text-xs text-muted-foreground">Aucun brouillon.</div>}
          {drafts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
              <input type="checkbox" checked={!!selected[p.id]}
                onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                className="h-4 w-4 accent-[#5DF8D8]" />
              {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.title ?? p.hook ?? "Sans titre"}</div>
                <div className="line-clamp-1 text-xs text-muted-foreground">{p.content}</div>
              </div>
              {p.image_url && <ImageIcon className="h-3.5 w-3.5 cml-text-holo" aria-label="Avec visuel" />}
              <button onClick={() => publish(p.id)} disabled={busy === p.id}
                className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-4 py-2 text-xs font-semibold text-primary-foreground cml-ring-holo">
                {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Linkedin className="h-3.5 w-3.5" />} Publier
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ============ POSTS PUBLIÉS ============ */}
      <div className="cml-bento p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" style={{ color: "#5DF8D8" }} />
          <h2 className="font-display text-lg font-semibold">Posts publiés</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {published.map((p) => {
            const a = p.analytics ?? {};
            const views = a.impressions || a.impressions_estimated || 0;
            return (
              <motion.div key={p.id} layout className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  {p.image_url && <img src={p.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{p.published_at ? new Date(p.published_at).toLocaleString() : ""}</div>
                    <div className="mt-1 line-clamp-1 font-medium">{p.title ?? p.hook ?? "Sans titre"}</div>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">{p.content}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Metric icon={<Eye className="h-3.5 w-3.5" />} label={a.impressions ? "Vues" : "Vues est."} value={views} />
                  <Metric icon={<MousePointerClick className="h-3.5 w-3.5" />} label="Clics" value={a.clicks ?? 0} />
                  <Metric icon={<Share2 className="h-3.5 w-3.5" />} label="Partages" value={a.shares ?? 0} />
                  <Metric icon={<Heart className="h-3.5 w-3.5" />} label="Likes" value={a.likes ?? 0} />
                  <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} label="Comm." value={a.comments ?? 0} />
                  <Metric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Engag." value={`${a.engagement_rate ?? 0}%`} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <button onClick={() => refreshOne(p.id)} className="text-muted-foreground hover:text-foreground">
                    {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </button>
                  {p.linkedin_urn && (
                    <a href={`https://www.linkedin.com/feed/update/${encodeURIComponent(p.linkedin_urn)}/`} target="_blank" rel="noreferrer" className="ml-auto cml-text-holo">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
          {published.length === 0 && <div className="text-xs text-muted-foreground">Aucun post publié pour le moment.</div>}
        </div>
      </div>

      {/* ============ JOURNAL ============ */}
      <AnimatePresence>
        {showLogs && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogs(false)}>
            <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
              className="cml-bento cml-holo-halo max-h-[80vh] w-full max-w-3xl overflow-auto p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Journal d'exécution</h3>
                <button onClick={() => setShowLogs(false)}><XCircle className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-1.5 font-mono text-[11px]">
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-2 rounded-md bg-white/5 px-2 py-1.5">
                    <span className="shrink-0 text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                    <span className={`shrink-0 uppercase ${l.level === "error" ? "text-red-300" : l.level === "warn" ? "text-amber-300" : l.level === "success" ? "cml-text-holo" : "text-muted-foreground"}`}>
                      {l.level}
                    </span>
                    <span className="shrink-0 text-muted-foreground">[{l.step ?? "-"}]</span>
                    <span className="break-all">{l.message}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-muted-foreground">Aucun événement enregistré.</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 cml-text-holo" />;
  if (status === "failed") return <AlertTriangle className="h-4 w-4 text-red-400" />;
  if (status === "processing") return <Loader2 className="h-4 w-4 animate-spin cml-text-holo" />;
  if (status === "cancelled") return <XCircle className="h-4 w-4 text-muted-foreground" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{icon} {label}</div>
      <div className="mt-0.5 font-display text-sm font-semibold">{value}</div>
    </div>
  );
}

function Stat({ label, value, icon, suffix }: { label: string; value: number; icon?: React.ReactNode; suffix?: string }) {
  return (
    <div className="cml-bento p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}{suffix}</div>
    </div>
  );
}
