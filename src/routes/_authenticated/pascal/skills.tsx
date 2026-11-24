import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSkills, upsertSkill, deleteSkill } from "@/pascal/lib/skills.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Wrench, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/skills")({ component: SkillsPage });

function SkillsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["skills"], queryFn: () => listSkills() });
  const [f, setF] = useState({ title: "", category: "objection" as const, content: "", priority: 5, active: true });
  const save = useMutation({
    mutationFn: () => upsertSkill({ data: { ...f, tags: [] } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); toast.success("Skill enregistré."); setF({ title: "", category: "objection", content: "", priority: 5, active: true }); },
  });
  const del = useMutation({ mutationFn: (id: string) => deleteSkill({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }) });

  return (
    <div className="space-y-6 max-w-5xl">
      <header><h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Wrench className="size-7" /> Skills</h1><p className="text-sm text-muted-foreground">Compétences que PASCAL consulte pour surmonter les objections et convertir.</p></header>

      <div className="bento p-5 space-y-3">
        <h2 className="font-display text-lg">Ajouter un skill</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Titre</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Catégorie</Label>
            <Select value={f.category} onValueChange={(v: any) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["objection","opener","closing","nurturing","psychology","resource"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Contenu / technique</Label><Textarea rows={5} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
        <div className="flex items-center gap-3"><Label>Priorité (1-10)</Label><Input type="number" min={1} max={10} className="w-24" value={f.priority} onChange={(e) => setF({ ...f, priority: parseInt(e.target.value || "5") })} /><Button onClick={() => save.mutate()} disabled={save.isPending || !f.title || !f.content} className="glow-primary press ml-auto"><Plus className="size-4 mr-2" />Ajouter</Button></div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(q.data ?? []).map((s: any) => (
          <div key={s.id} className="bento p-4 anim-in">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-xs font-mono text-primary uppercase">{s.category} · P{s.priority}</div><h3 className="font-display text-lg">{s.title}</h3></div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="size-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{s.content}</p>
          </div>
        ))}
        {q.data?.length === 0 && <div className="text-sm text-muted-foreground">Aucun skill pour l'instant.</div>}
      </div>
    </div>
  );
}