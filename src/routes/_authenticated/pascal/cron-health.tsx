import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCronHealth, clearTickLogs } from "@/pascal/lib/cron-health.functions";
import { runTickNow } from "@/pascal/lib/cron-config.functions";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/pascal/cron-health")({ component: CronHealthPage });

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}
function ago(iso: string | null | undefined) {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.round(s / 60)}min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)}h`;
  return `il y a ${Math.round(s / 86400)}j`;
}
function until(iso: string | null | undefined) {
  if (!iso) return "—";
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return "imminent";
  if (s < 60) return `dans ${s}s`;
  if (s < 3600) return `dans ${Math.round(s / 60)}min`;
  return `dans ${Math.round(s / 3600)}h`;
}

function CronHealthPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cron-health"], queryFn: () => getCronHealth(), refetchInterval: 15000 });
  const tick = useMutation({ mutationFn: () => runTickNow(), onSuccess: () => { toast.success("Cycle exécuté."); qc.invalidateQueries({ queryKey: ["cron-health"] }); } });
  const clear = useMutation({ mutationFn: () => clearTickLogs(), onSuccess: () => { toast.success("Journal vidé."); qc.invalidateQueries({ queryKey: ["cron-health"] }); } });
  const d = q.data;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><Activity className="size-7" /> Santé du Cron</h1>
          <p className="text-sm text-muted-foreground">État de l'automatisation, prochaines exécutions, historique des ticks et erreurs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="press" onClick={() => tick.mutate()} disabled={tick.isPending}><RefreshCw className={`size-4 mr-2 ${tick.isPending ? "animate-spin" : ""}`} /> Exécuter maintenant</Button>
          <Button variant="ghost" className="press" onClick={() => clear.mutate()} disabled={clear.isPending}><Trash2 className="size-4 mr-2" /> Vider journal</Button>
        </div>
      </header>

      <div className="grid md:grid-cols-4 gap-4">
        <KpiCard label="Dernier tick" value={ago(d?.stats.lastRun)} sub={fmt(d?.stats.lastRun)} />
        <KpiCard label="Ticks (60 derniers)" value={String(d?.stats.total ?? 0)} sub={`${d?.stats.successes ?? 0} succès`} />
        <KpiCard label="Erreurs" value={String(d?.stats.errors ?? 0)} sub={d?.stats.errors ? "à surveiller" : "aucune"} tone={d?.stats.errors ? "err" : "ok"} />
        <KpiCard label="Mode" value={d?.cfg?.fully_autonomous ? "100% autonome" : "Manuel"} sub={d?.cfg ? "config chargée" : "non configuré"} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <NextCard label="Prochain scan Sheet" iso={d?.next?.scan} last={d?.cfg?.last_scan_at} enabled={d?.cfg?.scan_enabled} interval={d?.cfg?.scan_interval_minutes} />
        <NextCard label="Prochaine lecture Gmail" iso={d?.next?.replies} last={d?.cfg?.last_replies_at} enabled={d?.cfg?.replies_enabled} interval={d?.cfg?.replies_interval_minutes} />
        <NextCard label="Prochaines relances" iso={d?.next?.followups} last={d?.cfg?.last_followups_at} enabled={d?.cfg?.followups_enabled} interval={d?.cfg?.followups_interval_minutes} />
      </div>

      <div className="bento p-4">
        <h2 className="font-display text-lg mb-3 flex items-center gap-2"><Clock className="size-4" /> Historique des ticks</h2>
        <div className="space-y-1.5 max-h-[520px] overflow-auto">
          {(d?.logs ?? []).map((l: any) => (
            <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="surface-1 p-3 flex items-center gap-3 text-sm">
              {l.status === "error" ? <XCircle className="size-4 text-destructive shrink-0" /> : l.status === "idle" ? <Clock className="size-4 text-muted-foreground shrink-0" /> : <CheckCircle2 className="size-4 text-success shrink-0" />}
              <div className="font-mono text-xs w-40 shrink-0 text-muted-foreground">{fmt(l.created_at)}</div>
              <div className="w-28 shrink-0 text-xs uppercase tracking-wider">{l.scope}</div>
              <div className="w-20 shrink-0 text-xs">{l.duration_ms ?? 0} ms</div>
              <div className="flex-1 min-w-0 truncate text-xs text-muted-foreground">{l.error ? l.error : JSON.stringify(l.result ?? {})}</div>
            </motion.div>
          ))}
          {(!d || d.logs.length === 0) && <div className="text-sm text-muted-foreground py-6 text-center">Pas encore de tick enregistré — patiente 1 minute ou clique sur « Exécuter maintenant ».</div>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "err" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bento bento-glow p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tone === "err" ? "text-destructive" : tone === "ok" ? "text-success" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </motion.div>
  );
}

function NextCard({ label, iso, last, enabled, interval }: { label: string; iso?: string | null; last?: string | null; enabled?: boolean; interval?: number | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bento p-5 space-y-1.5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{enabled ? until(iso) : "Désactivé"}</div>
      <div className="text-[11px] text-muted-foreground">Dernière exécution : {ago(last)}</div>
      <div className="text-[11px] text-muted-foreground">Intervalle : {interval ?? "—"} min</div>
    </motion.div>
  );
}