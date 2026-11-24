import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/feeloo/components/ui/tabs";
import { AiChatPanel } from "@/feeloo/components/ai-chat-panel";
import { Button } from "@/feeloo/components/ui/button";
import { ArrowLeft, Trash2, Sparkles, MapPin, Building2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteEntityFn } from "@/feeloo/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/jobs/$id")({
  head: () => ({ meta: [{ title: "Poste — TalentCortex" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [j, setJ] = useState<any>({});
  const [matches, setMatches] = useState<any[]>([]);
  const del = useServerFn(deleteEntityFn);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("fl_jobs").select("*").eq("id", id).maybeSingle();
      setJ(data ?? {});
      const { data: m } = await supabase
        .from("fl_candidate_job_matches")
        .select("*")
        .eq("job_id", id)
        .order("score", { ascending: false });
      const rows = m ?? [];
      const candIds = [...new Set(rows.map((r: any) => r.candidate_id))];
      let byId: Record<string, any> = {};
      if (candIds.length) {
        const { data: cl } = await supabase
          .from("fl_candidates")
          .select("id,full_name,headline,seniority,years_experience")
          .in("id", candIds);
        byId = Object.fromEntries((cl ?? []).map((c: any) => [c.id, c]));
      }
      setMatches(rows.map((r: any) => ({ ...r, candidates: byId[r.candidate_id] ?? null })));
    };
    load();
  }, [id]);

  const a = j?.ai_analysis ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/feeloo/jobs" })}><ArrowLeft className="size-4 mr-1" />Retour</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await del({ data: { entityType: "job", id } }); toast.success("Supprimé"); nav({ to: "/feeloo/jobs" }); }}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <BentoCard glow>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="size-20 rounded-3xl holo-bg grid place-items-center text-white"><Building2 className="size-9" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-semibold">{j.title ?? "Chargement…"}</h1>
            <p className="text-muted-foreground">{j.company}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {j.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{j.location}</span>}
              {j.seniority && <span className="px-2 py-0.5 rounded-full bg-white/60 border border-border">{j.seniority}</span>}
              {j.employment_type && <span>{j.employment_type}</span>}
              {(j.salary_min || j.salary_max) && <span>{j.salary_min ?? "?"}–{j.salary_max ?? "?"} {j.salary_currency ?? ""}</span>}
            </div>
          </div>
          {a.priority_score != null && <div className="text-right"><div className="text-5xl font-display holo-text">{a.priority_score}</div><div className="text-xs text-muted-foreground">Priorité IA</div></div>}
        </div>
      </BentoCard>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white/60 relative z-10 flex h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analysis"><Sparkles className="size-3 mr-1" />Analyse IA</TabsTrigger>
          <TabsTrigger value="requirements">Exigences</TabsTrigger>
          <TabsTrigger value="matches">Candidats ({matches.length})</TabsTrigger>
          <TabsTrigger value="chat">Chat IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <BentoCard><h3 className="font-display text-lg mb-2">Description</h3><p className="text-sm whitespace-pre-wrap">{j.description || "—"}</p></BentoCard>
          <BentoCard><h3 className="font-display text-lg mb-2">Missions</h3><ul className="text-sm space-y-1 list-disc list-inside">{(j.responsibilities ?? []).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></BentoCard>
          {(j.benefits ?? []).length > 0 && <BentoCard><h3 className="font-display text-lg mb-2">Avantages</h3><div className="flex flex-wrap gap-2">{j.benefits.map((b: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-white/60 border border-border text-sm">{b}</span>)}</div></BentoCard>}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-3">
          <BentoCard glow><h3 className="font-display text-lg mb-2">Synthèse IA</h3><p className="text-sm whitespace-pre-wrap">{a.summary_paragraph}</p></BentoCard>
          <div className="grid md:grid-cols-2 gap-3">
            <BentoCard><h4 className="font-medium mb-2">🎯 Profil idéal</h4><p className="text-sm">{a.ideal_candidate_profile}</p></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">💡 Compétences clés</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.key_competencies ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">📢 Canaux de sourcing</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.sourcing_channels ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">🧭 Étapes d'entretien</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.interview_stages ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">⚠️ Risques</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.risk_factors ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">💰 Benchmark rémunération</h4><p className="text-sm">{a.compensation_benchmark}</p></BentoCard>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-3">
          <BentoCard><h4 className="font-medium mb-2">Compétences requises</h4><div className="flex flex-wrap gap-2">{(j.required_skills ?? []).map((s: string, i: number) => <span key={i} className="px-3 py-1 rounded-full holo-bg text-white text-sm">{s}</span>)}</div></BentoCard>
          <BentoCard><h4 className="font-medium mb-2">Nice to have</h4><div className="flex flex-wrap gap-2">{(j.nice_to_have ?? []).map((s: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-white/60 border border-border text-sm">{s}</span>)}</div></BentoCard>
          <BentoCard><h4 className="font-medium mb-2">Prérequis</h4><ul className="text-sm space-y-1 list-disc list-inside">{(j.requirements ?? []).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></BentoCard>
        </TabsContent>

        <TabsContent value="matches" className="space-y-3">
          {matches.length === 0 && <BentoCard className="text-center py-8"><p className="text-sm text-muted-foreground">Aucun candidat ne correspond pour l'instant. Ajoute ou synchronise des CV — le matching IA se déclenche automatiquement à chaque nouveau profil.</p></BentoCard>}
          {matches.map((m) => (
            <Link key={m.id} to="/feeloo/candidates/$id" params={{ id: m.candidate_id }} className="block">
              <BentoCard className="hover:scale-[1.01] transition">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-2xl holo-bg grid place-items-center text-white text-xl font-display">{Math.round(Number(m.score))}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{m.candidates?.full_name ?? "Candidat"} <span className="text-muted-foreground text-xs">· {m.candidates?.headline || m.candidates?.seniority || ""}</span></div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{m.reasoning}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{(m.strengths ?? []).slice(0, 3).map((s: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-border">✓ {s}</span>)}</div>
                  </div>
                </div>
              </BentoCard>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="chat"><BentoCard><AiChatPanel entityType="job" entityId={id} /></BentoCard></TabsContent>
      </Tabs>
    </div>
  );
}