import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard, StatBento } from "@/feeloo/components/bento-card";
import { Users, Briefcase, Sparkles, Activity, Radio, Mail, Sheet } from "lucide-react";
import { Button } from "@/feeloo/components/ui/button";

export const Route = createFileRoute("/_authenticated/feeloo/")({
  head: () => ({ meta: [{ title: "Cockpit — TalentCortex" }, { name: "description", content: "Vue d'ensemble du recrutement IA en temps réel." }] }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({ candidates: 0, jobs: 0, matches: 0, avgScore: 0, hot: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [topMatches, setTopMatches] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const load = async () => {
    const [{ count: c }, { count: j }, { data: matches }, { data: acts }, { data: cands }] = await Promise.all([
      supabase.from("fl_candidates").select("*", { count: "exact", head: true }),
      supabase.from("fl_jobs").select("*", { count: "exact", head: true }),
      supabase.from("fl_candidate_job_matches").select("score, candidate_id, job_id, strengths, reasoning, candidates(full_name), jobs(title)").order("score", { ascending: false }).limit(6),
      supabase.from("fl_activity_log").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("fl_candidates").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    const avg = matches?.length ? Math.round(matches.reduce((s, m) => s + Number(m.score), 0) / matches.length) : 0;
    const hot = matches?.filter((m) => Number(m.score) >= 75).length ?? 0;
    setStats({ candidates: c ?? 0, jobs: j ?? 0, matches: matches?.length ?? 0, avgScore: avg, hot });
    setTopMatches(matches ?? []);
    setActivity(acts ?? []);
    setRecent(cands ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_candidates" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_activity_log" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-semibold">Cockpit <span className="holo-text">Intelligence RH</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Synchronisation Gmail & Google Sheets, matching IA en temps réel.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/50 rounded-full px-3 py-1.5 glass">
          <span className="size-2 rounded-full bg-accent pulse-dot" /> Cron actif · sync temps réel
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatBento label="Candidats" value={stats.candidates} icon={<Users className="size-5" />} sub="Profils IA analysés" />
        <StatBento label="Postes" value={stats.jobs} icon={<Briefcase className="size-5" />} sub="Ouverts" />
        <StatBento label="Score moyen" value={`${stats.avgScore}%`} icon={<Sparkles className="size-5" />} sub="Top matches" />
        <StatBento label="Matches chauds" value={stats.hot} icon={<Activity className="size-5" />} sub="≥ 75% affinité" />
      </div>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4">
        <BentoCard className="md:col-span-2" glow>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Top matches IA</h2>
            <Link to="/feeloo/candidates" className="text-xs text-muted-foreground hover:text-foreground">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {topMatches.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center">Aucun match pour le moment. Ajoute un candidat ou un poste.</div>}
            {topMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 hover:bg-white/60 transition">
                <div className="size-10 rounded-xl holo-bg grid place-items-center text-white font-semibold">{Math.round(Number(m.score))}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.candidates?.full_name} → {m.jobs?.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.reasoning || (m.strengths?.[0] ?? "")}</div>
                </div>
                <Link to="/feeloo/candidates/$id" params={{ id: m.candidate_id }} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground">Ouvrir</Link>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard>
          <h2 className="font-display text-xl mb-3">Flux d'activité</h2>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {activity.length === 0 && <div className="text-sm text-muted-foreground">Aucune activité.</div>}
            {activity.map((a) => (
              <div key={a.id} className="text-sm flex gap-2">
                <Radio className="size-3 mt-1.5 text-accent shrink-0" />
                <div>
                  <div>{a.message}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-FR")}</div>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4">
        <BentoCard className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Derniers candidats</h2>
            <Link to="/feeloo/candidates" className="text-xs text-muted-foreground hover:text-foreground">Voir tout →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {recent.map((c) => (
              <Link key={c.id} to="/feeloo/candidates/$id" params={{ id: c.id }} className="p-3 rounded-2xl bg-white/40 hover:bg-white/60 transition block">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-full holo-bg grid place-items-center text-white font-semibold text-sm">{c.full_name?.[0] ?? "?"}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.headline || c.seniority || "—"}</div>
                  </div>
                </div>
              </Link>
            ))}
            {recent.length === 0 && <div className="text-sm text-muted-foreground p-6 text-center col-span-2">Aucun candidat pour le moment.</div>}
          </div>
        </BentoCard>
        <BentoCard>
          <h2 className="font-display text-xl mb-3">Sources</h2>
          <div className="space-y-2">
            <Link to="/feeloo/integrations" className="p-3 rounded-2xl bg-white/40 hover:bg-white/60 flex items-center gap-3 block">
              <Mail className="size-4 text-accent" /><div><div className="text-sm font-medium">Gmail → CV</div><div className="text-xs text-muted-foreground">Extraction IA continue</div></div>
            </Link>
            <Link to="/feeloo/integrations" className="p-3 rounded-2xl bg-white/40 hover:bg-white/60 flex items-center gap-3 block">
              <Sheet className="size-4 text-accent" /><div><div className="text-sm font-medium">Google Sheets → Postes</div><div className="text-xs text-muted-foreground">Nouvelles lignes = nouveau poste</div></div>
            </Link>
            <div className="pt-2"><Button asChild className="w-full"><Link to="/feeloo/candidates">Ajouter manuellement</Link></Button></div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}