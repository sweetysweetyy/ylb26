import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/glass-card";
import { StatusBadge } from "@/components/status-badge";
import { CheckCircle2, ChevronLeft, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/mm/executions/$id")({
  component: ExecutionDetail,
});

type Exec = { id: string; automation_id: string; status: "pending"|"running"|"success"|"error"; started_at: string; finished_at: string|null; error: string|null; output: unknown; input: unknown; automations?: { name: string }|null };
type Log = { id: string; agent_id: string|null; agent_name?: string|null; step: number; message: string; payload: unknown; created_at: string };
type Action = { id: string; tool: string|null; label: string|null; agent_name: string|null; status: string; duration_ms: number|null; input: unknown; output: unknown; started_at: string };

function summaryOf(output: unknown): string | null {
  if (output == null) return null;
  if (typeof output === "string") return output.trim() || null;
  if (typeof output === "object") {
    const o = output as Record<string, unknown>;
    for (const k of ["summary", "result", "report", "text", "message"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) return o[k] as string;
    }
  }
  return null;
}

function hasContent(v: unknown) {
  if (v == null) return false;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).length > 0;
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  if (!hasContent(value)) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted-foreground">{title}</summary>
      <pre className="mt-1 max-h-80 overflow-auto rounded-lg border border-white/5 bg-black/30 p-2 font-mono text-xs whitespace-pre-wrap">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function ExecutionDetail() {
  const { id } = Route.useParams();
  const [exec, setExec] = useState<Exec | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  async function load() {
    const [e, l, a] = await Promise.all([
      supabase.from("mm_executions").select("*, automations:mm_automations(name)").eq("id", id).maybeSingle(),
      supabase.from("mm_execution_logs").select("*").eq("execution_id", id).order("step"),
      supabase.from("mm_execution_actions").select("*").eq("execution_id", id).order("started_at"),
    ]);
    setExec((e.data ?? null) as unknown as Exec | null);
    const ls = (l.data ?? []) as unknown as Log[];
    setLogs(ls);
    setActions((a.data ?? []) as unknown as Action[]);
    const ids = [...new Set(ls.map((x) => x.agent_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data } = await supabase.from("mm_agents").select("id, name").in("id", ids);
      setAgentNames(Object.fromEntries((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name])));
    }
  }
  useEffect(() => {
    load();
    const ch = supabase.channel(`exec-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mm_executions", filter: `id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "mm_execution_logs", filter: `execution_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "mm_execution_actions", filter: `execution_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!exec) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  const summary = summaryOf(exec.output);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link to="/mm/executions" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Retour
      </Link>
      <GlassCard>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{exec.automations?.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Démarrée {format(new Date(exec.started_at), "dd MMM yyyy HH:mm:ss", { locale: fr })}
              {exec.finished_at && <> · Terminée {format(new Date(exec.finished_at), "HH:mm:ss")}</>}
            </p>
          </div>
          <StatusBadge status={exec.status} />
        </div>
        {exec.error && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{exec.error}</div>}
      </GlassCard>

      {(summary || hasContent(exec.output)) && (
        <GlassCard>
          <h3 className="font-semibold">Résultat / Compte-rendu</h3>
          {summary && <div className="prose prose-sm mt-3 max-w-none dark:prose-invert"><ReactMarkdown>{summary}</ReactMarkdown></div>}
          <JsonBlock title="Sortie complète (JSON)" value={exec.output} />
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="font-semibold">Actions des outils ({actions.length})</h3>
        <div className="mt-4 space-y-2">
          {actions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Aucune action d'outil.</p>}
          {actions.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {a.status === "running" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {a.status === "success" && <CheckCircle2 className="size-4 text-success" />}
                  {a.status === "error" && <XCircle className="size-4 text-destructive" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-medium">{a.label ?? a.tool}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.tool ?? "—"} · {a.agent_name ?? "système"} · {a.status}
                    {a.duration_ms != null && <> · {(a.duration_ms / 1000).toFixed(1)} s</>}
                  </div>
                  <JsonBlock title="Entrée" value={a.input} />
                  <JsonBlock title="Sortie" value={a.output} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-semibold">Timeline ({logs.length})</h3>
        <div className="mt-4 space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Pas encore de logs.</p>}
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">#{log.step}</span> · {log.agent_name ?? (log.agent_id && agentNames[log.agent_id]) ?? "système"} · {format(new Date(log.created_at), "HH:mm:ss")}
              </div>
              <div className="mt-1 text-sm whitespace-pre-wrap">{log.message}</div>
              <JsonBlock title="Détails" value={log.payload} />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
