import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardKpis, pollRepliesNow } from "@/pascal/lib/prospects.functions";
import { scanNow } from "@/pascal/lib/sources.functions";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Inbox, Target, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pascal/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const qc = useQueryClient();
  const kpi = useQuery({ queryKey: ["kpis"], queryFn: () => dashboardKpis() });
  const scan = useMutation({
    mutationFn: () => scanNow(),
    onSuccess: (r) => { toast.success(`Scan terminé · ${r.added} nouveau(x) prospect(s), ${r.sent} email(s) envoyé(s), ${r.replies} réponse(s) traitée(s).`); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur scan"),
  });
  const poll = useMutation({
    mutationFn: () => pollRepliesNow(),
    onSuccess: (r) => { toast.success(`${r.processed} réponse(s) traitée(s).`); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur poll"),
  });

  const k = kpi.data;
  const counts = k?.counts ?? {};

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gradient">Cockpit</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble en temps réel de l'activité commerciale de PASCAL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => poll.mutate()} disabled={poll.isPending}>
            <Mail className="size-4 mr-2" /> Vérifier réponses
          </Button>
          <Button onClick={() => scan.mutate()} disabled={scan.isPending} className="glow-primary">
            <RefreshCw className={`size-4 mr-2 ${scan.isPending ? "animate-spin" : ""}`} /> Scanner + Démarrer
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Prospects" value={k?.total ?? 0} icon={<Inbox className="size-4" />} />
        <Kpi label="Taux de réponse" value={`${k?.responseRate ?? 0}%`} icon={<Activity className="size-4" />} accent />
        <Kpi label="Taux de conversion (RDV)" value={`${k?.conversionRate ?? 0}%`} icon={<Target className="size-4" />} accent />
        <Kpi label="RDV décrochés" value={counts.meeting_booked ?? 0} icon={<CheckCircle2 className="size-4" />} />
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Pipeline counts={counts} />
        <div className="lg:col-span-2 surface-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Journal de l'agent</h3>
            <span className="text-xs text-muted-foreground font-mono">temps réel</span>
          </div>
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {(k?.runs ?? []).map((r, i) => (
              <li key={i} className="surface-2 p-3 flex items-start gap-3 text-sm">
                {r.status === "success" ? <CheckCircle2 className="size-4 text-success mt-0.5" /> : r.status === "error" ? <AlertCircle className="size-4 text-destructive mt-0.5" /> : <Activity className="size-4 text-muted-foreground mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary">{r.kind}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                  {r.detail && <p className="text-xs text-muted-foreground mt-1 break-words">{r.detail}</p>}
                </div>
              </li>
            ))}
            {(k?.runs ?? []).length === 0 && <li className="text-sm text-muted-foreground">Aucune activité pour le moment.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`surface-1 p-5 ${accent ? "glow-primary" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="mt-3 text-3xl font-semibold font-mono">{value}</div>
    </div>
  );
}

function Pipeline({ counts }: { counts: Record<string, number> }) {
  const stages = [
    { k: "new", label: "Nouveaux", color: "bg-muted" },
    { k: "contacted", label: "Contactés", color: "bg-primary/40" },
    { k: "replied", label: "Répondus", color: "bg-primary/70" },
    { k: "meeting_booked", label: "RDV pris", color: "bg-success/70" },
    { k: "lost", label: "Perdus", color: "bg-destructive/40" },
  ];
  const max = Math.max(1, ...stages.map((s) => counts[s.k] ?? 0));
  return (
    <div className="surface-1 p-5">
      <h3 className="font-semibold mb-4">Pipeline</h3>
      <div className="space-y-3">
        {stages.map((s) => {
          const v = counts[s.k] ?? 0;
          return (
            <div key={s.k}>
              <div className="flex justify-between text-xs mb-1"><span>{s.label}</span><span className="font-mono">{v}</span></div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${s.color}`} style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}