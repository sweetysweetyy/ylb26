import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listProspects, triggerAgentForProspect, updateProspectStatus } from "@/pascal/lib/prospects.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessagesSquare, PauseCircle, User, Sparkles, Building2, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/pascal/prospects")({ component: ProspectsPage });

const STATUS_META: Record<string, { label: string; badge: string; ring: string; glow: string }> = {
  new: { label: "Nouveau", badge: "bg-accent/20 text-accent border-accent/40", ring: "ring-accent/40", glow: "from-accent/25" },
  contacted: { label: "Contacté", badge: "bg-primary/15 text-primary border-primary/40", ring: "ring-primary/40", glow: "from-primary/25" },
  replied: { label: "A répondu", badge: "bg-chart-2/15 text-chart-2 border-chart-2/40", ring: "ring-chart-2/40", glow: "from-chart-2/25" },
  meeting_booked: { label: "RDV pris", badge: "bg-success/20 text-success border-success/40", ring: "ring-success/40", glow: "from-success/30" },
  lost: { label: "Perdu", badge: "bg-destructive/15 text-destructive border-destructive/40", ring: "ring-destructive/30", glow: "from-destructive/20" },
  paused: { label: "En pause", badge: "bg-warning/15 text-warning border-warning/40", ring: "ring-warning/30", glow: "from-warning/20" },
};

const FILTERS = ["all", "new", "contacted", "replied", "meeting_booked", "paused"] as const;

function ProspectsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["prospects"], queryFn: () => listProspects() });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const trig = useMutation({
    mutationFn: (id: string) => triggerAgentForProspect({ data: { prospectId: id } }),
    onSuccess: () => { toast.success("Email envoyé par PASCAL."); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => updateProspectStatus({ data: v as any }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const data = list.data ?? [];
  const filtered = useMemo(() => filter === "all" ? data : data.filter((p) => p.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: data.length };
    for (const p of data) map[p.status] = (map[p.status] ?? 0) + 1;
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold holo-text flex items-center gap-2"><User className="size-7 text-primary" /> Prospects</h1>
          <p className="text-sm text-muted-foreground">Vue bento des contacts détectés dans vos sources.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <Filter className="size-4 text-muted-foreground mr-1" />
          {FILTERS.map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`press text-xs px-3 py-1.5 rounded-full border transition-all ${filter === k ? "bg-primary/20 border-primary/50 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {k === "all" ? "Tous" : STATUS_META[k]?.label ?? k} <span className="opacity-60 ml-1">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.new;
            const convs = p.conversations as unknown as Array<{ id: string }> | { id: string } | null;
            const conv = Array.isArray(convs) ? convs[0] : convs;
            return (
              <motion.article
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.03, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className={`bento bento-glow p-5 space-y-3 relative ring-1 ${meta.ring}`}
              >
                <div className={`absolute -inset-8 -z-10 rounded-3xl bg-gradient-to-tr ${meta.glow} to-transparent opacity-70 blur-2xl pointer-events-none`} />
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-lg truncate">{p.full_name ?? "Sans nom"}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{p.email}</div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${meta.badge}`}>{meta.label}</Badge>
                </div>
                {p.company && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="size-3" /> {p.company}</div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="surface-2 p-2"><div className="text-muted-foreground">Relances</div><div className="font-mono text-base">{p.followups_sent ?? 0}</div></div>
                  <div className="surface-2 p-2"><div className="text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Dernière</div><div className="font-mono text-xs">{p.last_action_at ? new Date(p.last_action_at).toLocaleDateString("fr-FR") : "—"}</div></div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.status === "new" && (
                    <Button size="sm" className="glow-primary press" onClick={() => trig.mutate(p.id)} disabled={trig.isPending}>
                      <Send className="size-3 mr-1" /> Démarrer PASCAL
                    </Button>
                  )}
                  {conv && (
                    <Link to="/pascal/conversations" search={{ id: conv.id }}>
                      <Button size="sm" variant="outline" className="press"><MessagesSquare className="size-3 mr-1" /> Fil</Button>
                    </Link>
                  )}
                  {p.status !== "paused" && p.status !== "lost" && (
                    <Button size="sm" variant="ghost" className="press" onClick={() => setStatus.mutate({ id: p.id, status: "paused" })}>
                      <PauseCircle className="size-3 mr-1" /> Pause
                    </Button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="bento p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <Sparkles className="size-8 text-primary/60" />
          Aucun prospect pour ce filtre. Configurez une source Google Sheet ou changez le filtre.
        </div>
      )}
    </div>
  );
}