import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/feeloo/components/ui/tabs";
import { AiChatPanel } from "@/feeloo/components/ai-chat-panel";
import { Button } from "@/feeloo/components/ui/button";
import { Mail, MapPin, Phone, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteEntityFn } from "@/feeloo/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/candidates/$id")({
  head: () => ({ meta: [{ title: "Profil candidat — TalentCortex" }] }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [c, setC] = useState<any>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const del = useServerFn(deleteEntityFn);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("fl_candidates").select("*").eq("id", id).maybeSingle();
      setC(data ?? {});
      setMatchesLoading(true);
      setMatchesError(null);
      const { data: m, error } = await supabase
        .from("fl_candidate_job_matches")
        .select("*")
        .eq("candidate_id", id)
        .order("score", { ascending: false });
      if (error) {
        setMatchesError(error.message);
        setMatches([]);
        setMatchesLoading(false);
        return;
      }
      const rows = m ?? [];
      const jobIds = [...new Set(rows.map((r: any) => r.job_id))];
      let jobsById: Record<string, any> = {};
      if (jobIds.length) {
        const { data: jl } = await supabase.from("fl_jobs").select("id,title,company,location,status").in("id", jobIds);
        jobsById = Object.fromEntries((jl ?? []).map((j: any) => [j.id, j]));
      }
      setMatches(rows.map((r: any) => ({ ...r, jobs: jobsById[r.job_id] ?? null })));
      setMatchesLoading(false);
    };
    load();
  }, [id]);

  const a = c?.ai_analysis ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/feeloo/candidates" })}><ArrowLeft className="size-4 mr-1" />Retour</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await del({ data: { entityType: "candidate", id } }); toast.success("Supprimé"); nav({ to: "/feeloo/candidates" }); }}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <BentoCard glow>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="size-20 rounded-3xl holo-bg grid place-items-center text-white text-3xl font-display font-semibold">{c.full_name?.[0] ?? "·"}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-display font-semibold">{c.full_name ?? "Chargement…"}</h1>
            <p className="text-muted-foreground">{c.headline}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {c.email && <span className="flex items-center gap-1"><Mail className="size-3" />{c.email}</span>}
              {c.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
              {c.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{c.location}</span>}
              {c.seniority && <span className="px-2 py-0.5 rounded-full bg-white/60 border border-border">{c.seniority}</span>}
              {c.years_experience != null && <span>{c.years_experience} ans d'exp.</span>}
            </div>
          </div>
          {a.overall_score != null && (
            <div className="text-right">
              <div className="text-5xl font-display holo-text">{a.overall_score}</div>
              <div className="text-xs text-muted-foreground">Score IA global</div>
            </div>
          )}
        </div>
      </BentoCard>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white/60 relative z-10 flex h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analysis"><Sparkles className="size-3 mr-1" />Analyse IA</TabsTrigger>
          <TabsTrigger value="experience">Expérience</TabsTrigger>
          <TabsTrigger value="skills">Compétences</TabsTrigger>
          <TabsTrigger value="matches">Postes ({matches.length})</TabsTrigger>
          <TabsTrigger value="chat">Chat IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <BentoCard><h3 className="font-display text-lg mb-2">Résumé</h3><p className="text-sm whitespace-pre-wrap">{c.summary || "—"}</p></BentoCard>
          {c.desired_roles?.length > 0 && <BentoCard><h3 className="font-display text-lg mb-2">Rôles ciblés</h3><div className="flex flex-wrap gap-2">{c.desired_roles.map((r: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-white/60 border border-border text-sm">{r}</span>)}</div></BentoCard>}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-3">
          <BentoCard glow>
            <h3 className="font-display text-lg mb-2">Synthèse IA</h3>
            <p className="text-sm whitespace-pre-wrap">{a.summary_paragraph || c.summary}</p>
          </BentoCard>
          <div className="grid md:grid-cols-2 gap-3">
            <BentoCard><h4 className="font-medium mb-2">🚀 Forces</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.strengths ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">⚠️ Points d'attention</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.red_flags ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">🎯 Rôles idéaux</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.best_roles ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
            <BentoCard><h4 className="font-medium mb-2">❓ Questions d'entretien recommandées</h4><ul className="text-sm space-y-1 list-disc list-inside">{(a.recommended_questions ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></BentoCard>
          </div>
        </TabsContent>

        <TabsContent value="experience" className="space-y-3">
          {(c.experiences ?? []).map((e: any, i: number) => (
            <BentoCard key={i}>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div><div className="font-medium">{e.role} · <span className="text-muted-foreground">{e.company}</span></div><div className="text-xs text-muted-foreground">{e.start} — {e.end || "présent"}</div></div>
              </div>
              {e.description && <p className="text-sm mt-2">{e.description}</p>}
              {e.achievements?.length > 0 && <ul className="text-sm mt-2 list-disc list-inside">{e.achievements.map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>}
            </BentoCard>
          ))}
          {(c.educations ?? []).length > 0 && <BentoCard><h4 className="font-medium mb-2">Formations</h4><ul className="text-sm space-y-1">{(c.educations ?? []).map((e: any, i: number) => <li key={i}>{e.degree} — {e.school} ({e.start}—{e.end})</li>)}</ul></BentoCard>}
        </TabsContent>

        <TabsContent value="skills" className="space-y-3">
          <BentoCard><h4 className="font-medium mb-2">Compétences techniques</h4><div className="flex flex-wrap gap-2">{(c.skills ?? []).map((s: string, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-white/60 border border-border text-sm">{s}</span>)}</div></BentoCard>
          <BentoCard><h4 className="font-medium mb-2">Soft skills</h4><div className="flex flex-wrap gap-2">{(c.soft_skills ?? []).map((s: string, i: number) => <span key={i} className="px-3 py-1 rounded-full holo-bg text-white text-sm">{s}</span>)}</div></BentoCard>
          <BentoCard><h4 className="font-medium mb-2">Langues</h4><div className="flex flex-wrap gap-2">{(c.languages ?? []).map((l: any, i: number) => <span key={i} className="px-3 py-1 rounded-full bg-white/60 border border-border text-sm">{l.name} · {l.level}</span>)}</div></BentoCard>
        </TabsContent>

        <TabsContent value="matches" className="space-y-3">
          {matchesLoading && <BentoCard className="text-center py-8"><p className="text-sm text-muted-foreground">Chargement des postes…</p></BentoCard>}
          {!matchesLoading && matchesError && <BentoCard className="text-center py-8"><p className="text-sm text-destructive">Impossible de charger les postes : {matchesError}</p></BentoCard>}
          {!matchesLoading && !matchesError && matches.length === 0 && <BentoCard className="text-center py-8"><p className="text-sm text-muted-foreground">Aucun poste ne correspond encore à ce candidat. Ajoute ou synchronise des postes — le matching IA se relance automatiquement.</p></BentoCard>}
          {matches.map((m) => (
            <Link key={m.id} to="/feeloo/jobs/$id" params={{ id: m.job_id }} className="block">
              <BentoCard className="hover:scale-[1.01] transition">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-2xl holo-bg grid place-items-center text-white text-xl font-display">{Math.round(Number(m.score))}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{m.jobs?.title ?? "Poste"} <span className="text-muted-foreground">· {m.jobs?.company || m.jobs?.location || ""}</span></div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{m.reasoning}</div>
                  </div>
                </div>
              </BentoCard>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="chat"><BentoCard><AiChatPanel entityType="candidate" entityId={id} /></BentoCard></TabsContent>
      </Tabs>
    </div>
  );
}