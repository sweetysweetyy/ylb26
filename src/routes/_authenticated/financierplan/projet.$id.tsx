import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Download, Loader2, MessageSquare, RefreshCw, Sparkles, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fpSupabase as supabase } from "@/financierplan/lib/db";
import { generateSection } from "@/financierplan/lib/plan.functions";
import { SECTIONS, type SectionContent, type SectionKey } from "@/financierplan/lib/sections";
import { exportPlanPdf } from "@/financierplan/lib/pdf";
import { SectionView } from "@/financierplan/components/plan/SectionView";
import { ChatPanel } from "@/financierplan/components/plan/ChatPanel";
import { Button } from "@/financierplan/components/ui/button";
import { Card } from "@/financierplan/components/ui/card";
import { Badge } from "@/financierplan/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financierplan/projet/$id")({
  validateSearch: z.object({ auto: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Prévisionnel financier — Previsio" },
      {
        name: "description",
        content: "Consultez, affinez et exportez les 12 volets de votre prévisionnel financier.",
      },
      { property: "og:title", content: "Prévisionnel financier — Previsio" },
      { property: "og:description", content: "Votre dossier financier complet, prêt à présenter." },
    ],
  }),
  component: ProjectWorkspace,
});

type PlanRow = { section_key: string; content: SectionContent; version: number; status: string };

function ProjectWorkspace() {
  const { id } = Route.useParams();
  const { auto } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateSection);

  const [active, setActive] = useState<SectionKey>("developpement");
  const [running, setRunning] = useState<SectionKey | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const started = useRef(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("fp_projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fp_plan_sections")
        .select("section_key, content, version, status")
        .eq("project_id", id);
      if (error) throw error;
      return data as unknown as PlanRow[];
    },
  });

  const byKey = new Map(sections.map((s) => [s.section_key, s]));
  const readyCount = sections.filter((s) => s.status === "ready").length;

  const runAll = async (only?: SectionKey) => {
    const targets = only ? [only] : SECTIONS.filter((s) => !byKey.has(s.key)).map((s) => s.key);
    if (targets.length === 0) {
      toast.info("Tous les volets sont déjà générés.");
      return;
    }
    for (const key of targets) {
      setRunning(key);
      setActive(key);
      try {
        await generate({ data: { projectId: id, sectionKey: key } });
        await qc.invalidateQueries({ queryKey: ["sections", id] });
        await qc.invalidateQueries({ queryKey: ["project", id] });
      } catch (e) {
        toast.error(
          `${key} : ${e instanceof Error ? e.message : "génération impossible"}`,
        );
        break;
      }
    }
    setRunning(null);
  };

  useEffect(() => {
    if (auto && !started.current && project) {
      started.current = true;
      void navigate({ to: "/financierplan/projet/$id", params: { id }, search: {}, replace: true });
      void runAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, project]);

  const current = byKey.get(active);
  const def = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      <header className="no-print border-b border-border/50 bg-background/70 px-6 py-4 backdrop-blur-xl lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold">
                {project?.name ?? "Chargement…"}
              </h1>
              <Badge variant={readyCount >= SECTIONS.length ? "live" : "muted"}>
                {readyCount}/{SECTIONS.length} volets
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {[project?.sector, project?.location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setChatOpen((v) => !v)}
              aria-label="Basculer le chat"
            >
              {chatOpen ? <X className="size-4" /> : <MessageSquare className="size-4" />}
              Chat IA
            </Button>
            <Button
              variant="glass"
              size="sm"
              disabled={!project || readyCount === 0}
              onClick={() =>
                exportPlanPdf(
                  project as never,
                  sections
                    .filter((s) => s.status === "ready")
                    .map((s) => ({ section_key: s.section_key, content: s.content })),
                )
              }
            >
              <Download className="size-4" /> Export PDF
            </Button>
            <Button
              variant="holo"
              size="sm"
              onClick={() => runAll()}
              disabled={running !== null}
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {readyCount === 0 ? "Générer le dossier" : "Compléter"}
            </Button>
          </div>
        </div>
        <Progress
          value={Math.round((readyCount / SECTIONS.length) * 100)}
          className="mt-3 h-1"
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="no-print hidden w-64 shrink-0 overflow-y-auto border-r border-border/50 p-3 xl:block">
          {SECTIONS.map((s) => {
            const row = byKey.get(s.key);
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active === s.key
                    ? "bg-secondary/70 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/40",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-semibold",
                    row?.status === "ready"
                      ? "holo-gradient text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {running === s.key ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    s.index
                  )}
                </span>
                <span className="truncate">{s.short}</span>
              </button>
            );
          })}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:px-10">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs",
                  active === s.key
                    ? "border-primary/40 bg-secondary/70"
                    : "border-border text-muted-foreground",
                )}
              >
                {s.index}. {s.short}
              </button>
            ))}
          </div>

          {current?.status === "ready" ? (
            <SectionView def={def} content={current.content} version={current.version} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card variant="bento" className="holo-halo p-10 text-center">
                <h2 className="font-display text-xl font-semibold">{def.title}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {def.description}
                </p>
                <Button
                  variant="holo"
                  className="mt-6"
                  onClick={() => runAll(def.key)}
                  disabled={running !== null}
                >
                  {running === def.key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Générer ce volet
                </Button>
              </Card>
            </motion.div>
          )}

          {current?.status === "ready" && (
            <div className="no-print mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => runAll(def.key)}
                disabled={running !== null}
              >
                <RefreshCw className="size-3.5" /> Régénérer ce volet
              </Button>
            </div>
          )}
        </main>

        {chatOpen && (
          <aside className="hidden w-[380px] shrink-0 border-l border-border/50 bg-background/60 backdrop-blur-xl lg:block">
            <ChatPanel projectId={id} activeSection={active} />
          </aside>
        )}
      </div>
    </div>
  );
}
