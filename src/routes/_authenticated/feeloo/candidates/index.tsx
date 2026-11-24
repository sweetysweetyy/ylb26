import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BentoCard } from "@/feeloo/components/bento-card";
import { Button } from "@/feeloo/components/ui/button";
import { Textarea } from "@/feeloo/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/feeloo/components/ui/dialog";
import { Input } from "@/feeloo/components/ui/input";
import { Plus, Search, Sparkles, Upload } from "lucide-react";
import { importCvFileFn } from "@/feeloo/lib/import.functions";
import { setCandidateStatusFn } from "@/feeloo/lib/hr-status.functions";
import { CANDIDATE_STATUSES, StatusBadge, candidateStatus } from "@/feeloo/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/feeloo/components/ui/select";
import { analyzeCvFn } from "@/feeloo/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feeloo/candidates/")({
  head: () => ({ meta: [{ title: "Candidats — TalentCortex" }, { name: "description", content: "Base de candidats analysée par IA." }] }),
  component: CandidatesList,
});

function CandidatesList() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cv, setCv] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const analyze = useServerFn(analyzeCvFn);
  const importCv = useServerFn(importCvFileFn);
  const setStatus = useServerFn(setCandidateStatusFn);
  const [uploads, setUploads] = useState<Array<{ name: string; state: string }>>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const arr = Array.from(files).slice(0, 15);
    setUploads(arr.map((f) => ({ name: f.name, state: "en attente" })));
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      setUploads((u) => u.map((x, k) => (k === i ? { ...x, state: "extraction + IA…" } : x)));
      try {
        const buf = new Uint8Array(await f.arrayBuffer());
        let bin = ""; const chunk = 0x8000;
        for (let o = 0; o < buf.length; o += chunk) bin += String.fromCharCode(...buf.subarray(o, o + chunk));
        const res: any = await importCv({ data: { fileName: f.name, base64: btoa(bin) } });
        setUploads((u) => u.map((x, k) => (k === i ? { ...x, state: `✓ ${res.full_name} (${res.matched} match)` } : x)));
      } catch (e: any) {
        setUploads((u) => u.map((x, k) => (k === i ? { ...x, state: `✗ ${e?.message ?? "échec"}` } : x)));
      }
    }
    toast.success("Import terminé");
  };


  const load = async () => {
    const { data } = await supabase.from("fl_candidates").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("cand-list").on("postgres_changes", { event: "*", schema: "public", table: "fl_candidates" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    if (cv.trim().length < 40) { toast.error("Colle un CV plus complet."); return; }
    setLoading(true);
    try {
      const c = await analyze({ data: { rawCv: cv, source: "manual" } });
      toast.success(`${c.full_name} analysé et matché.`);
      setCv(""); setOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Erreur IA"); } finally { setLoading(false); }
  };

  const filtered = list.filter((c) => !q || (c.full_name + " " + (c.headline ?? "") + " " + JSON.stringify(c.skills ?? [])).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-display font-semibold">Candidats <span className="holo-text">IA</span></h1>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9 bg-white/60 w-64" /></div>
          <label className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-white/60 text-sm cursor-pointer hover:bg-white/80 transition">
            <Upload className="size-4" />Importer des CV (PDF)
            <input type="file" multiple accept=".pdf,.txt,.docx,.htm,.html" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Analyser un CV</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Analyse IA d'un CV</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Colle le texte brut d'un CV ; l'IA construit le profil complet, l'analyse et lance le matching.</p>
                <Textarea value={cv} onChange={(e) => setCv(e.target.value)} className="min-h-[280px] bg-white/60" placeholder="Colle le CV ici…" />
                <Button onClick={submit} disabled={loading} className="w-full">{loading ? "Analyse IA…" : <><Sparkles className="size-4 mr-1" />Analyser</>}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {uploads.length > 0 && (
        <BentoCard>
          <div className="text-sm font-medium mb-2">Import de CV</div>
          <div className="space-y-1 text-xs">
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center justify-between gap-2"><span className="truncate">{u.name}</span><span className="text-muted-foreground shrink-0">{u.state}</span></div>
            ))}
          </div>
        </BentoCard>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && <BentoCard className="col-span-full text-center py-12"><div className="text-muted-foreground">Aucun candidat. Colle un CV ou connecte Gmail.</div></BentoCard>}
        {filtered.map((c) => (
          <Link key={c.id} to="/feeloo/candidates/$id" params={{ id: c.id }} className="block">
            <BentoCard className="hover:scale-[1.01] transition h-full">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-2xl holo-bg grid place-items-center text-white font-semibold">{c.full_name?.[0] ?? "?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.headline || c.seniority || "—"}</div>
                </div>
                {c.ai_analysis?.overall_score && <div className="text-right"><div className="text-2xl font-display holo-text">{c.ai_analysis.overall_score}</div><div className="text-[10px] text-muted-foreground">score IA</div></div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(c.skills ?? []).slice(0, 5).map((s: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-border">{s}</span>)}
              </div>
              <div className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.summary || "—"}</div>
              <div className="mt-3 flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <StatusBadge label={candidateStatus(c.status).label} tone={candidateStatus(c.status).tone} />
                {!c.available && <span className="text-[10px] text-muted-foreground">indisponible pour les postes</span>}
                <Select value={c.status} onValueChange={async (v) => { await setStatus({ data: { id: c.id, status: v as any } }); toast.success("Statut mis à jour"); }}>
                  <SelectTrigger className="ml-auto h-7 w-36 bg-white/60 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CANDIDATE_STATUSES.map((s2) => <SelectItem key={s2.value} value={s2.value}>{s2.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </BentoCard>
          </Link>
        ))}
      </div>
    </div>
  );
}