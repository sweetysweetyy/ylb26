import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/feeloo/components/ui/select";
import { Brain, Radar, ListChecks, Sparkles } from "lucide-react";
import { smartTalentRadarFn, smartShortlistFn } from "@/feeloo/lib/smart.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/smart")({
  head: () => ({
    meta: [
      { title: "Smart IA — TalentCortex" },
      { name: "description", content: "Radar du vivier, shortlists IA et actions prioritaires de recrutement." },
      { property: "og:title", content: "Smart IA — TalentCortex" },
      { property: "og:description", content: "Intelligence de recrutement : radar de compétences et shortlists automatiques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SmartPage,
});

function SmartPage() {
  const radar = useServerFn(smartTalentRadarFn);
  const shortlist = useServerFn(smartShortlistFn);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [r, setR] = useState<any>(null);
  const [sl, setSl] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("fl_jobs").select("id,title,status,accepts_applications").order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <header className="pl-12 md:pl-0">
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">Smart <span className="holo-text">IA</span></h1>
        <p className="text-xs text-muted-foreground mt-1">Intelligence décisionnelle sur ton vivier et tes postes.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <BentoCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-xl holo-bg grid place-items-center text-white"><Radar className="size-4" /></div>
            <div className="font-medium">Radar du vivier</div>
            <Button size="sm" className="ml-auto" disabled={busy === "radar"}
              onClick={async () => { setBusy("radar"); try { setR(await radar()); } catch (e: any) { toast.error(e?.message); } finally { setBusy(null); } }}>
              <Sparkles className="size-4 mr-1" />{busy === "radar" ? "Analyse…" : "Analyser"}
            </Button>
          </div>
          {!r && <p className="text-sm text-muted-foreground">Lance l'analyse pour obtenir tensions de compétences, risques et actions prioritaires.</p>}
          {r && (
            <div className="space-y-3 text-sm">
              <div className="text-lg font-display">{r.headline} {typeof r.health_score === "number" && <span className="holo-text">· {r.health_score}/100</span>}</div>
              {(r.skill_gaps ?? []).length > 0 && (
                <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tensions de compétences</div>
                  <div className="flex flex-wrap gap-1">{r.skill_gaps.map((g: any, i: number) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white/60 border border-border">{g.skill} · {g.severity}</span>))}</div></div>
              )}
              {(r.insights ?? []).map((i: any, k: number) => (
                <div key={k} className="rounded-xl bg-white/50 p-3"><div className="font-medium">{i.title}</div><div className="text-xs text-muted-foreground">{i.detail}</div></div>
              ))}
              {(r.actions ?? []).length > 0 && (
                <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Actions prioritaires</div>
                  <ul className="list-disc pl-5 space-y-1">{r.actions.map((a: any, i: number) => <li key={i}>{a.action} <span className="text-muted-foreground text-xs">({a.priority})</span></li>)}</ul></div>
              )}
            </div>
          )}
        </BentoCard>

        <BentoCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-9 rounded-xl holo-bg grid place-items-center text-white"><ListChecks className="size-4" /></div>
            <div className="font-medium">Shortlist IA</div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="bg-white/60 w-full sm:w-72"><SelectValue placeholder="Choisis un poste" /></SelectTrigger>
              <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}</SelectContent>
            </Select>
            <Button disabled={!jobId || busy === "sl"}
              onClick={async () => { setBusy("sl"); try { setSl(await shortlist({ data: { jobId, size: 5 } })); } catch (e: any) { toast.error(e?.message); } finally { setBusy(null); } }}>
              <Brain className="size-4 mr-1" />{busy === "sl" ? "Génération…" : "Générer"}
            </Button>
          </div>
          {sl?.strategy && <p className="text-xs text-muted-foreground mb-2">{sl.strategy}</p>}
          <div className="space-y-2">
            {(sl?.shortlist ?? []).map((c: any, i: number) => (
              <div key={i} className="rounded-xl bg-white/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">#{c.rank ?? i + 1} {c.full_name}</div>
                  <div className="font-display holo-text">{c.score}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.why}</div>
                {(c.interview_focus ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{c.interview_focus.map((f: string, k: number) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-border">{f}</span>)}</div>}
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
