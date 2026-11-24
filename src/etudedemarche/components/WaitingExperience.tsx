import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { Badge } from "@/etudedemarche/components/ui/badge";
import { Card } from "@/etudedemarche/components/ui/card";
import type { StudyLog } from "@/etudedemarche/lib/study-types";

const TIPS = [
  "Astuce business : un marché « trop petit » est souvent un segment mal découpé.",
  "Le saviez-vous ? 42 % des projets échouent faute de demande réelle. Votre étude corrige ça.",
  "Conseil : les organismes officiels adorent les chiffres sourcés et datés.",
  "Pendant que l'IA recoupe les données, préparez vos hypothèses de chiffre d'affaires.",
  "Un bon TAM/SAM/SOM se justifie toujours par une méthode de calcul explicite.",
  "Astuce : le meilleur concurrent à étudier est celui que vos clients citent spontanément.",
  "Patience : l'analyse croisée de dizaines de signaux prend quelques dizaines de secondes.",
  "Conseil de pro : un plan d'action sans indicateur de suivi n'est qu'un vœu.",
];

const PHASES = [
  { at: 0, label: "Cadrage de votre demande" },
  { at: 25, label: "Collecte et recoupement des données" },
  { at: 55, label: "Analyse stratégique (PESTEL, Porter, SWOT)" },
  { at: 80, label: "Rédaction du rapport final" },
];

export function WaitingExperience({
  progress,
  logs = [],
}: {
  progress: number;
  logs?: StudyLog[];
}) {
  const [tip, setTip] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 5200);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(tipTimer);
      clearInterval(clock);
    };
  }, []);

  const currentPhase = [...PHASES].reverse().find((p) => progress >= p.at) ?? PHASES[0]!;

  return (
    <Card variant="bento" className="halo relative overflow-hidden p-8">
      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <motion.span
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute inset-0 rounded-full [background:var(--gradient-holo)] blur-xl"
          />
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border border-white/20 border-t-white/70"
          />
          <span className="font-display text-2xl font-semibold">{Math.round(progress)}%</span>
        </div>

        <div className="space-y-2">
          <Badge variant="live">Étude en cours · {formatTime(elapsed)}</Badge>
          <h2 className="font-display text-2xl">{currentPhase.label}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Une recherche réelle demande du temps : l'IA croise, vérifie puis rédige. Vous pouvez
            garder cet onglet ouvert, tout est sauvegardé en direct.
          </p>
        </div>

        <div className="h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-white/10">
          <motion.div
            animate={{ width: `${Math.max(4, progress)}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="h-full rounded-full [background:var(--gradient-holo)]"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={tip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="min-h-10 max-w-md text-sm text-holo"
          >
            {TIPS[tip]}
          </motion.p>
        </AnimatePresence>

        {logs.length > 0 && (
          <ul className="w-full max-w-lg space-y-1.5 rounded-2xl bg-white/5 p-4 text-left text-xs text-muted-foreground">
            {logs.slice(-5).map((log, i) => (
              <li key={`${log.at}-${i}`} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--holo-1)]" />
                {log.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")}s` : `${s}s`;
}