import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, Cpu, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fpSupabase as supabase } from "@/financierplan/lib/db";
import { updateSettings } from "@/financierplan/lib/plan.functions";
import { AI_MODELS, DEFAULT_MODEL } from "@/financierplan/lib/sections";
import { useAuth } from "@/financierplan/hooks/useAuth";
import { Button } from "@/financierplan/components/ui/button";
import { Card } from "@/financierplan/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/financierplan/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financierplan/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Previsio" },
      {
        name: "description",
        content: "Choisissez votre modèle d'IA, votre devise et votre taux d'imposition.",
      },
      { property: "og:title", content: "Paramètres — Previsio" },
      { property: "og:description", content: "Réglages du moteur d'intelligence financière." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const save = useServerFn(updateSettings);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({
    ai_model: DEFAULT_MODEL as string,
    currency: "EUR",
    tax_rate: 25,
    language: "fr",
  });

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fp_settings")
        .select("ai_model, currency, tax_rate, language")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setState({
        ai_model: data.ai_model ?? DEFAULT_MODEL,
        currency: data.currency ?? "EUR",
        tax_rate: Number(data.tax_rate ?? 25),
        language: data.language ?? "fr",
      });
    }
  }, [data]);

  const persist = async (next = state) => {
    setBusy(true);
    try {
      await save({ data: next });
      toast.success("Paramètres enregistrés.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Badge variant="soft">Configuration</Badge>
        <h1 className="mt-3 font-display text-3xl font-semibold">Paramètres</h1>
        <p className="mt-1 text-muted-foreground">
          Connecté en tant que <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </motion.div>

      <Card variant="bento" className="mt-8 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Modèle d'intelligence artificielle</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {AI_MODELS.map((m) => {
            const active = state.ai_model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const next = { ...state, ai_model: m.id };
                  setState(next);
                  void persist(next);
                }}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-primary/40 bg-secondary/50 shadow-[var(--shadow-holo)]"
                    : "border-border hover:border-primary/30 hover:bg-secondary/25",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold">{m.label}</span>
                  {active ? (
                    <Check className="size-4 text-primary" />
                  ) : (
                    <Badge variant="muted">{m.vendor}</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{m.hint}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card variant="bento" className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Hypothèses par défaut</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <Input
              id="currency"
              value={state.currency}
              onChange={(e) => setState({ ...state, currency: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax">Taux d'IS (%)</Label>
            <Input
              id="tax"
              type="number"
              min={0}
              max={60}
              value={state.tax_rate}
              onChange={(e) => setState({ ...state, tax_rate: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lang">Langue des documents</Label>
            <Input
              id="lang"
              value={state.language}
              onChange={(e) => setState({ ...state, language: e.target.value })}
            />
          </div>
        </div>
        <Button variant="holo" className="mt-5" onClick={() => persist()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </Button>
      </Card>
    </div>
  );
}
