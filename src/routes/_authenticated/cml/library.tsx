import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Trash2, Search, Download, FileSpreadsheet, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/_authenticated/cml/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [fullImg, setFullImg] = useState<string | null>(null);

  async function load() {
    let query = supabase.from("cml_posts").select("*").order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    const { data } = await query;
    setPosts((data ?? []).filter((p) => !q || (p.content ?? "").toLowerCase().includes(q.toLowerCase()) || (p.title ?? "").toLowerCase().includes(q.toLowerCase())));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, q]);

  async function del(id: string) {
    await supabase.from("cml_posts").delete().eq("id", id);
    load();
  }
  function copy(p: any) {
    const text = `${p.content}\n\n${(p.hashtags ?? []).map((h: string) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  }

  function exportCSV() {
    const headers = ["id", "title", "hook", "content", "hashtags", "status", "scheduled_at", "published_at", "likes", "comments", "created_at"];
    const rows = posts.map((p) => headers.map((h) => {
      let v: any = p[h];
      if (h === "hashtags") v = (p.hashtags ?? []).join(" ");
      if (h === "likes") v = p.analytics?.likes ?? 0;
      if (h === "comments") v = p.analytics?.comments ?? 0;
      const s = String(v ?? "").replace(/"/g, '""');
      return `"${s}"`;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `holo-posts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} post(s) exportés`);
  }

  function exportPDF() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Export Holo CM</title>
      <style>body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#111} h1{color:#0f766e} .post{border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0;page-break-inside:avoid} .meta{color:#666;font-size:12px} .content{white-space:pre-line;line-height:1.55;margin-top:8px} img{max-width:100%;border-radius:8px;margin-top:8px} .tags{margin-top:8px;color:#0f766e;font-size:12px}</style>
      </head><body><h1>Export Holo CM — ${posts.length} posts</h1>
      ${posts.map((p) => `<div class="post">
        <div class="meta">${p.status} · ${new Date(p.created_at).toLocaleString()}${p.published_at ? " · publié " + new Date(p.published_at).toLocaleString() : ""}</div>
        <h2>${escapeHtml(p.title ?? p.hook ?? "Sans titre")}</h2>
        <div class="content">${escapeHtml(p.content ?? "")}</div>
        <div class="tags">${(p.hashtags ?? []).map((h: string) => "#" + escapeHtml(h)).join(" ")}</div>
        ${p.image_url ? `<img src="${p.image_url}"/>` : ""}
      </div>`).join("")}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup bloquée"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bibliothèque</div>
          <h1 className="mt-1 font-display text-4xl font-semibold">Tous tes <span className="cml-text-holo">posts</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={exportPDF} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="cml-bento flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
          <option className="bg-[#1A312C]" value="all">Tous</option>
          <option className="bg-[#1A312C]" value="draft">Brouillons</option>
          <option className="bg-[#1A312C]" value="scheduled">Planifiés</option>
          <option className="bg-[#1A312C]" value="published">Publiés</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <div key={p.id} className="cml-bento overflow-hidden p-0">
            {p.image_url && (
              <button onClick={() => setFullImg(p.image_url)} className="relative block w-full group">
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <img src={p.image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <span className="absolute top-2 right-2 rounded-full bg-black/60 p-2 opacity-0 group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </button>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase">{p.status}</span>
                {p.scheduled_at && <span className="text-[10px] text-muted-foreground">{new Date(p.scheduled_at).toLocaleString()}</span>}
                {p.analytics?.likes != null && (
                  <span className="text-[10px] cml-text-holo">♥ {p.analytics.likes} · 💬 {p.analytics.comments ?? 0}</span>
                )}
              </div>
              <h3 className="mt-2 line-clamp-1 font-display text-lg font-semibold">{p.title ?? p.hook ?? "Sans titre"}</h3>
              <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{p.content}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(p.hashtags ?? []).slice(0, 5).map((h: string) => (
                  <span key={h} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">#{h}</span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/cml/editor" search={{ postId: p.id } as any}
                  className="flex-1 rounded-full cml-bg-holo px-4 py-2 text-center text-xs font-semibold text-primary-foreground">
                  Éditer
                </Link>
                <button onClick={() => copy(p)} className="rounded-full border border-white/10 bg-white/5 p-2">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => del(p.id)} className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="cml-bento col-span-full p-10 text-center text-muted-foreground">Aucun post pour le moment.</div>
        )}
      </div>

      <AnimatePresence>
        {fullImg && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFullImg(null)}>
            <img src={fullImg} alt="" className="max-h-full max-w-full rounded-lg" />
            <button onClick={() => setFullImg(null)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
