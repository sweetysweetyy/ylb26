import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAutoSkills, listAgentMemory } from "@/pascal/lib/skills.functions";
import { generateDailyAutoSkillReport } from "@/pascal/lib/reset.functions";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pascal/auto-skills")({ component: AutoSkillsPage });

function AutoSkillsPage() {
  const qc = useQueryClient();
  const auto = useQuery({ queryKey: ["auto-skills"], queryFn: () => listAutoSkills() });
  const mem = useQuery({ queryKey: ["memory"], queryFn: () => listAgentMemory() });
  const daily = useMutation({ mutationFn: () => generateDailyAutoSkillReport(), onSuccess: (r) => { toast.success(r.summary); qc.invalidateQueries({ queryKey: ["memory"] }); } });
  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex justify-between items-end gap-4">
        <div><h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Brain className="size-7" /> Auto-Skills</h1><p className="text-sm text-muted-foreground">Ce que PASCAL apprend seul de ses succès et échecs.</p></div>
        <Button onClick={() => daily.mutate()} disabled={daily.isPending} className="glow-primary press"><Sparkles className="size-4 mr-2" />Bilan quotidien</Button>
      </header>
      <div className="bento p-5"><h2 className="font-display text-xl mb-3">Tactiques auto-apprises</h2><div className="grid md:grid-cols-2 gap-3">{(auto.data ?? []).map((s: any) => (<div key={s.id} className="surface-1 p-4 anim-in"><div className="flex justify-between text-xs font-mono"><span className="text-primary">score {s.score}</span><span className="text-muted-foreground">{s.win_count}W · {s.loss_count}L</span></div><p className="text-sm mt-2">{s.tactic}</p></div>))}{auto.data?.length === 0 && <div className="text-sm text-muted-foreground">Encore rien.</div>}</div></div>
      <div className="bento p-5"><h2 className="font-display text-xl mb-3">Mémoire épisodique</h2><ul className="space-y-2 max-h-[500px] overflow-y-auto">{(mem.data ?? []).map((m: any) => (<li key={m.id} className="surface-2 p-3 text-sm anim-in"><span className="font-mono text-xs mr-2 uppercase text-primary">{m.kind}</span><span className="font-medium">{m.technique}</span>{m.outcome && <span className="text-muted-foreground"> — {m.outcome}</span>}</li>))}{mem.data?.length === 0 && <li className="text-sm text-muted-foreground">Mémoire vide.</li>}</ul></div>
    </div>
  );
}