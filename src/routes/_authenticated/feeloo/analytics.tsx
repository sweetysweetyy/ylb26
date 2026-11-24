import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard, StatBento } from "@/feeloo/components/bento-card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Briefcase, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feeloo/analytics")({
  head: () => ({ meta: [{ title: "Analytique — TalentCortex" }] }),
  component: Analytics,
});

function Analytics() {
  const [data, setData] = useState<any>({ candidates: [], jobs: [], matches: [], activity: [] });
  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: j }, { data: m }, { data: a }] = await Promise.all([
        supabase.from("fl_candidates").select("*"),
        supabase.from("fl_jobs").select("*"),
        supabase.from("fl_candidate_job_matches").select("score, created_at, candidate_id, job_id"),
        supabase.from("fl_activity_log").select("*").order("created_at", { ascending: false }).limit(30),
      ]);
      setData({ candidates: c ?? [], jobs: j ?? [], matches: m ?? [], activity: a ?? [] });
    })();
  }, []);

  const buckets = [0, 20, 40, 60, 80, 100].map((min, i, arr) => ({
    range: i === arr.length - 1 ? `${min}+` : `${min}-${arr[i + 1] - 1}`,
    count: data.matches.filter((x: any) => Number(x.score) >= min && (i === arr.length - 1 || Number(x.score) < arr[i + 1])).length,
  }));
  const sourceDist = ["gmail", "sheets", "manual"].map((s) => ({ name: s, value: data.candidates.filter((c: any) => c.source === s).length + data.jobs.filter((j: any) => j.source === s).length }));
  const colors = ["#FE017C", "#7B39EB", "#FA5608", "#001952"];

  const daily: Record<string, { day: string; cands: number; jobs: number }> = {};
  for (const c of data.candidates) { const d = new Date(c.created_at).toISOString().slice(0, 10); daily[d] = daily[d] || { day: d, cands: 0, jobs: 0 }; daily[d].cands++; }
  for (const j of data.jobs) { const d = new Date(j.created_at).toISOString().slice(0, 10); daily[d] = daily[d] || { day: d, cands: 0, jobs: 0 }; daily[d].jobs++; }
  const dailyArr = Object.values(daily).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);

  const avg = data.matches.length ? Math.round(data.matches.reduce((s: number, m: any) => s + Number(m.score), 0) / data.matches.length) : 0;
  const conversion = data.jobs.length ? Math.round((data.matches.filter((m: any) => Number(m.score) >= 70).length / data.jobs.length) * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display font-semibold">Analytique <span className="holo-text">Recrutement</span></h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBento label="Candidats" value={data.candidates.length} icon={<Users className="size-5" />} />
        <StatBento label="Postes" value={data.jobs.length} icon={<Briefcase className="size-5" />} />
        <StatBento label="Score moyen" value={`${avg}%`} icon={<Sparkles className="size-5" />} />
        <StatBento label="Top matches / poste" value={conversion} icon={<TrendingUp className="size-5" />} sub="≥70%" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <BentoCard><h3 className="font-display text-lg mb-3">Distribution des scores de matching</h3>
          <div className="h-64"><ResponsiveContainer><BarChart data={buckets}><XAxis dataKey="range" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#FE017C" radius={8} /></BarChart></ResponsiveContainer></div>
        </BentoCard>
        <BentoCard><h3 className="font-display text-lg mb-3">Sources</h3>
          <div className="h-64"><ResponsiveContainer><PieChart><Pie data={sourceDist} dataKey="value" nameKey="name" outerRadius={90} label>{sourceDist.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </BentoCard>
        <BentoCard className="md:col-span-2"><h3 className="font-display text-lg mb-3">Flux quotidien (14j)</h3>
          <div className="h-64"><ResponsiveContainer><LineChart data={dailyArr}><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line type="monotone" dataKey="cands" stroke="#FE017C" strokeWidth={2} /><Line type="monotone" dataKey="jobs" stroke="#7B39EB" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </BentoCard>
      </div>
    </div>
  );
}