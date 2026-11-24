import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { WaitingExperience } from "@/etudedemarche/components/WaitingExperience";
import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { useSettings } from "@/etudedemarche/lib/queries";
import { createStudy, launchStudy } from "@/etudedemarche/lib/studies.functions";
import { AI_MODELS, type StudyAnalysis } from "@/etudedemarche/lib/study-types";

export const Route = createFileRoute("/_authenticated/etudedemarche/studies/new")({
  head: () => ({
    meta: [
      { title: "Nouvelle étude — Étude de marché" },
      { name: "description", content: "Décrivez votre besoin, l'IA cadre puis réalise l'étude de marché." },
      { property: "og:title", content: "Nouvelle étude — Étude de marché" },
      { property: "og:description", content: "Lancez une étude de marché complète en langage naturel." },
    ],
  }),
  component: NewStudy,
});

const EXAMPLES = [
  "J'ouvre une salle d'escalade de bloc à Rennes, avec un espace café. Marché, concurrence, prix et rentabilité ?",
  "Je lance une marque de cosmétiques solides bio vendus en ligne en France. Taille du marché et positionnement ?",
  "Étude pour un service de maintenance prédictive IoT auprès des PME industrielles en Occitanie.",
];

function NewStudy() {
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<"idle" | "analyzing" | "analyzed" | "running">("idle");
  const [analysis, setAnalysis] = useState<StudyAnalysis | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: settings } = useSettings(user?.id);
  const create = useServerFn(createStudy);
  const launch = useServerFn(launchStudy);

  const modelLabel = AI_MODELS.find((m) => m.id === settings?.model)?.label ?? settings?.model;

  async function analyze() {
    if (brief.trim().length < 20) {
      toast.error("Décrivez votre besoin en quelques phrases (20 caractères minimum).");
      return;
    }
    setPhase("analyzing");
    setProgress(4);
    try {
      const result = await create({ data: { brief: brief.trim() } });
      setAnalysis(result.analysis);
      setStudyId(result.studyId);
      setPhase("analyzed");
    } catch (e) {
      setPhase("idle");
      toast.error(e instanceof Error ? e.message : "Analyse impossible.");
    }
  }

  async function run() {
    if (!studyId) return;
    setPhase("running");
    setProgress(10);
    const ticker = setInterval(() => setProgress((p) => Math.min(p + 1.2, 95)), 900);
    try {
      await launch({ data: { studyId } });
      setProgress(100);
      toast.success("Étude terminée.");
      void navigate({ to: "/etudedemarche/studies/$id", params: { id: studyId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'étude a échoué.");
      setPhase("analyzed");
    } finally {
      clearInterval(ticker);
    }
  }

  if (phase === "analyzing" || phase === "running") {
    return (
      <div className="mx-auto max-w-3xl pt-6">
        <WaitingExperience progress={phase === "analyzing" ? 6 : progress} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="halo">
        <Badge variant="live">Moteur {modelLabel}</Badge>
        <h1 className="mt-3 font-display text-3xl md:text-4xl">Décrivez votre étude de marché</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          En langage naturel, comme à un consultant. Le moteur reformule, cadre le périmètre puis
          conduit l'étude complète en appliquant vos méthodologies.
        </p>
      </header>

      <Card variant="bento" className="p-6">
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={7}
          placeholder="Ex. : J'ouvre une salle d'escalade de bloc à Rennes avec un espace café…"
          className="resize-none border-white/10 bg-white/5 text-base"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setBrief(ex)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {ex.slice(0, 52)}…
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="holo" size="lg" onClick={() => void analyze()}>
            <Wand2 /> Analyser ma demande
          </Button>
        </div>
      </Card>

      {phase === "analyzed" && analysis && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="bento" className="space-y-5 p-6">
            <div>
              <Badge variant="holo">Cadrage validé par l'IA</Badge>
              <h2 className="mt-3 font-display text-2xl">{analysis.titre_suggere}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{analysis.reformulation}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Secteur" value={analysis.secteur} />
              <Info label="Zone" value={analysis.zone_geographique} />
              <Info label="Cible" value={analysis.cible} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <List title="Objectifs" items={analysis.objectifs} />
              <List title="Questions clés" items={analysis.questions_cles} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Plan de recherche</h3>
              <ol className="space-y-2">
                {(analysis.plan_de_recherche ?? []).map((step, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 p-3 text-xs text-muted-foreground">
                    <span className="text-foreground">{step.etape}</span> — {step.objectif}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex justify-end">
              <Button variant="holo" size="lg" onClick={() => void run()}>
                <Sparkles /> Lancer l'étude complète
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--holo-1)]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}