import { createFileRoute } from "@tanstack/react-router";
import { Check, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/etudedemarche/components/ui/badge";
import { Button } from "@/etudedemarche/components/ui/button";
import { Card } from "@/etudedemarche/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { useSaveSettings, useSettings } from "@/etudedemarche/lib/queries";
import { AI_MODELS, DEPTH_OPTIONS } from "@/etudedemarche/lib/study-types";

export const Route = createFileRoute("/_authenticated/etudedemarche/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Étude de marché" },
      {
        name: "description",
        content: "Choisissez votre modèle d'IA, la profondeur d'analyse et la langue de vos études.",
      },
      { property: "og:title", content: "Paramètres — Étude de marché" },
      { property: "og:description", content: "Modèles d'IA et préférences d'étude." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings(user?.id);
  const save = useSaveSettings(user?.id);
  const [model, setModel] = useState("google/gemini-3.6-flash");
  const [depth, setDepth] = useState("standard");

  useEffect(() => {
    if (settings) {
      setModel(settings.model);
      setDepth(settings.depth);
    }
  }, [settings]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="halo">
        <Badge variant="live">Moteur d'intelligence</Badge>
        <h1 className="mt-3 font-display text-3xl">Paramètres</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le modèle sélectionné pilote l'analyse de votre demande et la rédaction du rapport final.
        </p>
      </header>

      <Card variant="bento" className="p-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-holo" />
          <h2 className="font-display text-lg">Modèle d'IA</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                model === m.id
                  ? "border-[var(--holo-2)] bg-white/10"
                  : "border-border/40 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">{m.label}</p>
                {model === m.id ? (
                  <Check className="h-4 w-4 text-holo" />
                ) : (
                  <Badge variant="outline">{m.tier}</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card variant="bento" className="p-6">
        <h2 className="font-display text-lg">Profondeur par défaut</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DEPTH_OPTIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDepth(d.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                depth === d.id
                  ? "border-[var(--holo-2)] bg-white/10"
                  : "border-border/40 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm">{d.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card variant="bento" className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <Label>Compte</Label>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="holo"
          disabled={save.isPending}
          onClick={() =>
            save.mutate(
              { model, depth },
              { onSuccess: () => toast.success("Préférences enregistrées.") },
            )
          }
        >
          Enregistrer
        </Button>
      </Card>
    </div>
  );
}