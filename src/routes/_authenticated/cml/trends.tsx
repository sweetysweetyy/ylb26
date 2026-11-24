import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { refreshTrends, trendToIdea } from "@/cml/lib/trends.functions";
import { toast } from "sonner";
import { Radar, RefreshCw, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const Route = createFileRoute("/_authenticated/cml/trends")({
  component: TrendsPage,
  head: () => ({
    meta: [
      { title: "Radar de tendances LinkedIn en direct | Holo CM" },
      { name: "description", content: "Détecte les sujets chauds de ton secteur en temps réel et transforme-les en idées de posts LinkedIn viraux." },
      { property: "og:title", content: "Radar de tendances live" },
      { property: "og:description", content: "Veille automatique et conversion des tendances en idées de posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function TrendsPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = useServerFn(refreshTrends);
  const toIdea = useServerFn(trendToIdea);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from("cml_trends").select("*").order("score", { ascending: false }).limit(60);
    setTrends(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function crawl() {
    setBusy("all");
    try { const r: any = await refresh({}); toast.success(`${r?.inserted ?? 0} tendance(s) captée(s)`); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  async function convert(id: string) {
    setBusy(id);
    try { await toIdea({ data: { trendId: id } }); toast.success("Idée créée 🎯"); navigate({ to: "/cml/ideas" }); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Veille</div>
          <h1 className="mt-1 font-display text-4xl font-semibold">Radar de <span className="cml-text-holo">tendances live</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">Actualisé automatiquement toutes les 3 heures.</p>
        </div>
        <button onClick={crawl} disabled={busy === "all"}
          className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-5 py-2.5 text-sm font-semibold text-primary-foreground cml-ring-holo">
          {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Scanner maintenant
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {trends.map((t) => (
          <motion.div key={t.id} layout className="cml-bento p-5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Radar className="h-3 w-3" /> {t.source}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 cml-text-holo">score {t.score ?? 0}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold">{t.title}</h3>
            {t.summary && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.summary}</p>}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <button onClick={() => convert(t.id)} disabled={busy === t.id}
                className="inline-flex items-center gap-1.5 rounded-full cml-bg-holo px-3 py-1.5 font-semibold text-primary-foreground cml-ring-holo">
                {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} En faire un post
              </button>
              {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="ml-auto cml-text-holo"><ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          </motion.div>
        ))}
        {trends.length === 0 && <div className="cml-bento col-span-full p-10 text-center text-muted-foreground">Aucune tendance captée. Lance un scan.</div>}
      </div>
    </div>
  );
}
