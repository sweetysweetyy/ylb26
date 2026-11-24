import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listActionPlans, upsertActionPlan, deleteActionPlan } from "@/pascal/lib/action-plans.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Target, Plus, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pascal/action-plans")({ component: PlansPage });

function PlansPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plans"], queryFn: () => listActionPlans() });
  const save = useMutation({ mutationFn: (p: any) => upsertActionPlan({ data: p }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan sauvegardé."); } });
  const del = useMutation({ mutationFn: (id: string) => deleteActionPlan({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }) });
  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex justify-between items-end"><div><h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Target className="size-7" /> Plans d'action</h1><p className="text-sm text-muted-foreground">Séquences déclenchées selon l'humeur du prospect.</p></div><Button className="glow-primary press" onClick={() => save.mutate({ name: "Nouveau plan", description: "", trigger: "no_reply", steps: [{ delay_hours: 48, angle: "", instruction: "" }], active: true })}><Plus className="size-4 mr-2" />Nouveau</Button></header>
      <div className="space-y-4">{(q.data ?? []).map((p: any) => <PlanCard key={p.id} plan={p} onSave={(data) => save.mutate(data)} onDelete={() => del.mutate(p.id)} />)}</div>
    </div>
  );
}

function PlanCard({ plan, onSave, onDelete }: { plan: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [p, setP] = useState({ id: plan.id, name: plan.name, description: plan.description, trigger: plan.trigger, steps: plan.steps ?? [], active: plan.active });
  return (
    <div className="bento p-5 space-y-3 anim-in">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 grid md:grid-cols-3 gap-2">
          <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Nom" />
          <Select value={p.trigger} onValueChange={(v) => setP({ ...p, trigger: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["no_reply","angry","ghosted","objection","interested_but_wait"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <div className="flex items-center gap-2"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} /><Label>Actif</Label></div>
        </div>
        <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => onSave(p)}><Save className="size-4" /></Button><Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="size-4" /></Button></div>
      </div>
      <Textarea rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} placeholder="Description" />
      <div className="space-y-2">
        {p.steps.map((s: any, i: number) => (
          <div key={i} className="surface-1 p-3 grid md:grid-cols-[100px_1fr_2fr_auto] gap-2 items-center">
            <Input type="number" value={s.delay_hours} onChange={(e) => { const arr = [...p.steps]; arr[i] = { ...s, delay_hours: parseFloat(e.target.value || "0") }; setP({ ...p, steps: arr }); }} />
            <Input value={s.angle} placeholder="Angle" onChange={(e) => { const arr = [...p.steps]; arr[i] = { ...s, angle: e.target.value }; setP({ ...p, steps: arr }); }} />
            <Input value={s.instruction} placeholder="Instruction" onChange={(e) => { const arr = [...p.steps]; arr[i] = { ...s, instruction: e.target.value }; setP({ ...p, steps: arr }); }} />
            <Button size="icon" variant="ghost" onClick={() => setP({ ...p, steps: p.steps.filter((_: any, j: number) => j !== i) })}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="press" onClick={() => setP({ ...p, steps: [...p.steps, { delay_hours: 48, angle: "", instruction: "" }] })}><Plus className="size-4 mr-1" />Étape</Button>
      </div>
    </div>
  );
}