import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { ArrowLeft, Download, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { statusLabel } from "./index";
import { WaitingExperience } from "@/etudedemarche/components/WaitingExperience";
import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { exportStudyPdf } from "@/etudedemarche/lib/pdf";
import { useStudy } from "@/etudedemarche/lib/queries";
import { launchStudy, regenerateStudy } from "@/etudedemarche/lib/studies.functions";

export const Route = createFileRoute("/_authenticated/etudedemarche/studies/$id")({
  head: () => ({
    meta: [
      { title: "Rapport d'étude — Étude de marché" },
      { name: "description", content: "Consultez et téléchargez votre étude de marché au format PDF professionnel." },
      { property: "og:title", content: "Rapport d'étude — Étude de marché" },
      { property: "og:description", content: "Rapport d'étude de marché complet, exportable en PDF." },
    ],
  }),
  component: StudyDetail,
});

function StudyDetail() {
  const { id } = Route.useParams();
  const { data: study, isLoading } = useStudy(id);
  const { user } = useAuth();
  const launch = useServerFn(launchStudy);
  const regenerate = useServerFn(regenerateStudy);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!study) return <p className="text-sm text-muted-foreground">Étude introuvable.</p>;

  const report = study.report;

  async function run(regen: boolean) {
    setBusy(true);
    try {
      if (regen) await regenerate({ data: { studyId: id } });
      else await launch({ data: { studyId: id } });
      toast.success("Étude terminée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'étude a échoué.");
    } finally {
      setBusy(false);
    }
  }

  if (busy || study.status === "researching") {
    return (
      <div className="mx-auto max-w-3xl pt-6">
        <WaitingExperience progress={study.progress || 10} logs={study.logs} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/etudedemarche/studies"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Mes études
          </Link>
          <Badge variant={study.status === "completed" ? "holo" : "live"}>
            {statusLabel(study.status)}
          </Badge>
          <h1 className="mt-3 font-display text-3xl">{report?.titre ?? study.title}</h1>
          {report?.sous_titre && (
            <p className="mt-1 text-sm text-muted-foreground">{report.sous_titre}</p>
          )}
        </div>
        <div className="flex gap-2">
          {report && (
            <Button
              variant="holo"
              onClick={() =>
                exportStudyPdf(report, {
                  author: user?.email ?? undefined,
                  date: new Date(study.updated_at).toLocaleDateString("fr-FR"),
                })
              }
            >
              <Download /> Télécharger le PDF
            </Button>
          )}
          {study.status !== "completed" && (
            <Button variant="holo" onClick={() => void run(false)}>
              <Sparkles /> Lancer l'étude
            </Button>
          )}
          {study.status === "completed" && (
            <Button variant="glass" onClick={() => void run(true)}>
              <RefreshCw /> Régénérer
            </Button>
          )}
        </div>
      </div>

      {study.error && (
        <Card variant="bento" className="border-destructive/40 p-4 text-sm text-destructive">
          {study.error}
        </Card>
      )}

      {!report ? (
        <Card variant="bento" className="p-8">
          <h2 className="font-display text-lg">Cadrage de la demande</h2>
          <p className="mt-2 text-sm text-muted-foreground">{study.analysis?.reformulation}</p>
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {(study.analysis?.objectifs ?? []).map((o, i) => (
              <li key={i}>• {o}</li>
            ))}
          </ul>
        </Card>
      ) : (
        <Tabs defaultValue="rapport">
          <TabsList className="glass rounded-2xl">
            <TabsTrigger value="rapport">Rapport</TabsTrigger>
            <TabsTrigger value="marche">Marché</TabsTrigger>
            <TabsTrigger value="strategie">Stratégie</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="rapport" className="mt-4 space-y-4">
            <Card variant="bento" className="p-6">
              <h2 className="font-display text-lg">Résumé exécutif</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {report.resume_executif}
              </p>
            </Card>
            {(report.sections ?? []).map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card variant="bento" className="p-6">
                  <h3 className="font-display text-lg">{section.titre}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {section.contenu}
                  </p>
                  {section.points_cles?.length > 0 && (
                    <ul className="mt-4 space-y-1.5 text-xs">
                      {section.points_cles.map((p, j) => (
                        <li key={j} className="flex gap-2 text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--holo-1)]" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="marche" className="mt-4 grid gap-4 md:grid-cols-2">
            <Card variant="bento" className="p-6 md:col-span-2">
              <h3 className="font-display text-lg">Indicateurs clés</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(report.taille_marche ?? []).map((k, i) => (
                  <div key={i} className="rounded-2xl bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {k.indicateur}
                    </p>
                    <p className="mt-1 font-display text-xl text-holo">{k.valeur}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{k.commentaire}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Segments</h3>
              <ul className="mt-4 space-y-3">
                {(report.segments ?? []).map((s, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm">{s.nom}</p>
                      <Badge variant="outline">{s.poids_estime}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Concurrence</h3>
              <ul className="mt-4 space-y-3">
                {(report.concurrents ?? []).map((c, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 p-3 text-xs text-muted-foreground">
                    <p className="text-sm text-foreground">{c.nom}</p>
                    <p className="mt-1">{c.positionnement}</p>
                    <p className="mt-1 text-emerald-200/80">Forces : {c.forces}</p>
                    <p>Faiblesses : {c.faiblesses}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="strategie" className="mt-4 grid gap-4 md:grid-cols-2">
            <Card variant="bento" className="p-6 md:col-span-2">
              <h3 className="font-display text-lg">SWOT</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Swot title="Forces" items={report.swot?.forces} />
                <Swot title="Faiblesses" items={report.swot?.faiblesses} />
                <Swot title="Opportunités" items={report.swot?.opportunites} />
                <Swot title="Menaces" items={report.swot?.menaces} />
              </div>
            </Card>
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Recommandations</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(report.recommandations ?? []).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </Card>
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Plan d'action</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {(report.plan_action ?? []).map((a, i) => (
                  <li key={i} className="rounded-xl bg-white/5 p-3">
                    <span className="text-foreground">{a.horizon}</span> — {a.action}
                    <p className="mt-1">KPI : {a.indicateur}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="bento" className="p-6 md:col-span-2">
              <h3 className="font-display text-lg">Risques</h3>
              <ul className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                {(report.risques ?? []).map((r, i) => (
                  <li key={i} className="rounded-xl bg-white/5 p-3">
                    <p className="text-foreground">{r.risque}</p>
                    <p className="mt-1">Impact : {r.impact}</p>
                    <p>Mitigation : {r.mitigation}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-4 space-y-4">
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Sources et fiabilité</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {(report.sources ?? []).map((s, i) => (
                  <li key={i} className="rounded-xl bg-white/5 p-3">
                    <p className="text-foreground">{s.titre}</p>
                    <p>
                      {s.origine} · fiabilité : {s.fiabilite}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="bento" className="p-6">
              <h3 className="font-display text-lg">Méthodologie</h3>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {report.methodologie}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">{report.limites}</p>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Swot({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {(items ?? []).map((i, k) => (
          <li key={k}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}