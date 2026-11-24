import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncComments, draftCommentReplies, sendCommentReply } from "@/cml/lib/linkedin.functions";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Loader2, Sparkles, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cml/comments")({
  component: CommentsPage,
  head: () => ({
    meta: [
      { title: "Réponses IA aux commentaires LinkedIn | Holo CM" },
      { name: "description", content: "Importe les commentaires de tes posts LinkedIn et génère des réponses personnalisées dans ta voix de marque." },
      { property: "og:title", content: "Réponses IA aux commentaires" },
      { property: "og:description", content: "Génère et publie des réponses LinkedIn en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CommentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const sync = useServerFn(syncComments);
  const draft = useServerFn(draftCommentReplies);
  const send = useServerFn(sendCommentReply);

  async function load() {
    const { data } = await supabase.from("cml_comment_drafts").select("*").order("created_at", { ascending: false }).limit(80);
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function run(fn: () => Promise<any>, key: string, msg: string) {
    setBusy(key);
    try { await fn(); toast.success(msg); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Engagement</div>
          <h1 className="mt-1 font-display text-4xl font-semibold">Commentaires <span className="cml-text-holo">assistés par IA</span></h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => run(() => sync({}), "sync", "Commentaires importés")} disabled={busy === "sync"}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Importer
          </button>
          <button onClick={() => run(() => draft({ data: {} }), "draft", "Réponses générées")} disabled={busy === "draft"}
            className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-5 py-2 text-sm font-semibold text-primary-foreground cml-ring-holo">
            {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Générer les réponses
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="cml-bento p-5">
            <div className="text-xs text-muted-foreground">{c.author_name ?? "Utilisateur LinkedIn"} · {new Date(c.created_at).toLocaleString()}</div>
            <p className="mt-1 text-sm">{c.comment_text}</p>
            <textarea
              value={c.reply_text ?? ""}
              onChange={(e) => setRows((r) => r.map((x) => (x.id === c.id ? { ...x, reply_text: e.target.value } : x)))}
              placeholder="Réponse suggérée par l'IA…"
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{c.status ?? "draft"}</span>
              <button onClick={() => run(() => send({ data: { id: c.id, text: c.reply_text ?? "" } }), c.id, "Réponse envoyée")}
                disabled={busy === c.id || !c.reply_text}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full cml-bg-holo px-4 py-1.5 text-xs font-semibold text-primary-foreground cml-ring-holo disabled:opacity-40">
                {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Répondre
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="cml-bento p-10 text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-6 w-6" />
            <p className="mt-2 text-sm">Aucun commentaire importé pour l'instant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
