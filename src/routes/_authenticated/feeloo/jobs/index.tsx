import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Textarea } from "@/feeloo/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/feeloo/components/ui/dialog";
import { Input } from "@/feeloo/components/ui/input";
import { Plus, Search, Sparkles, MapPin, Building2 } from "lucide-react";
import { analyzeJobFn } from "@/feeloo/lib/ai.functions";
import { toast } from "sonner";
import { setJobStatusFn } from "@/feeloo/lib/hr-status.functions";
import { JOB_STATUSES, StatusBadge, jobStatus } from "@/feeloo/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/feeloo/components/ui/select";
import { Switch } from "@/feeloo/components/ui/switch";

export const Route = createFileRoute("/_authenticated/feeloo/jobs/")({
  head: () => ({ meta: [{ title: "Postes — TalentCortex" }, { name: "description", content: "Fiches de poste générées par IA." }] }),
  component: JobsList,
});

function JobsList() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const analyze = useServerFn(analyzeJobFn);
  const setStatus = useServerFn(setJobStatusFn);

  const load = async () => {
    const { data } = await supabase.from("fl_jobs").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("jobs-list").on("postgres_changes", { event: "*", schema: "public", table: "fl_jobs" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    if (raw.trim().length < 20) { toast.error("Description trop courte."); return; }
    setLoading(true);
    try {
      const j = await analyze({ data: { rawInput: raw, source: "manual" } });
      toast.success(`Poste "${j.title}" créé.`); setRaw(""); setOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Erreur IA"); } finally { setLoading(false); }
  };

  const filtered = list.filter((j) => !q || (j.title + " " + (j.company ?? "") + " " + JSON.stringify(j.required_skills ?? [])).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-display font-semibold">Postes <span className="holo-text">à pourvoir</span></h1>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9 bg-white/60 w-64" /></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Nouveau poste</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Créer une fiche de poste par IA</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Colle une description brute ou une ligne Sheet ; l'IA construit une fiche complète et lance le matching.</p>
                <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[240px] bg-white/60" placeholder="Décris le poste…" />
                <Button onClick={submit} disabled={loading} className="w-full">{loading ? "Analyse IA…" : <><Sparkles className="size-4 mr-1" />Générer</>}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.length === 0 && <BentoCard className="col-span-full text-center py-12"><div className="text-muted-foreground">Aucun poste. Crée ta première fiche ou connecte Google Sheets.</div></BentoCard>}
        {filtered.map((j) => (
          <Link key={j.id} to="/feeloo/jobs/$id" params={{ id: j.id }} className="block">
            <BentoCard className="hover:scale-[1.01] transition h-full">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-2xl holo-bg grid place-items-center text-white"><Building2 className="size-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    {j.company && <span>{j.company}</span>}
                    {j.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{j.location}</span>}
                    {j.seniority && <span className="px-2 py-0.5 rounded-full bg-white/60 border border-border">{j.seniority}</span>}
                  </div>
                </div>
                {j.ai_analysis?.priority_score && <div className="text-right"><div className="text-2xl font-display holo-text">{j.ai_analysis.priority_score}</div><div className="text-[10px] text-muted-foreground">priorité</div></div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <StatusBadge label={jobStatus(j.status).label} tone={jobStatus(j.status).tone} />
                <Select value={j.status} onValueChange={async (v) => { await setStatus({ data: { id: j.id, status: v as any } }); toast.success("Statut du poste mis à jour"); }}>
                  <SelectTrigger className="h-7 w-32 bg-white/60 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_STATUSES.map((s2) => <SelectItem key={s2.value} value={s2.value}>{s2.label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{j.accepts_applications ? "Candidatures ouvertes" : "Ajouts bloqués"}</span>
                  <Switch checked={j.accepts_applications !== false} onCheckedChange={async (v) => { await setStatus({ data: { id: j.id, accepts_applications: v } }); toast.success(v ? "Candidatures ouvertes" : "Ajout de profils bloqué"); }} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(j.required_skills ?? []).slice(0, 6).map((s: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-border">{s}</span>)}
              </div>
            </BentoCard>
          </Link>
        ))}
      </div>
    </div>
  );
}