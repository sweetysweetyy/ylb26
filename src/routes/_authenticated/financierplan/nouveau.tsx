import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createProject } from "@/financierplan/lib/plan.functions";
import { Button } from "@/financierplan/components/ui/button";
import { Card } from "@/financierplan/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/financierplan/components/ui/badge";
import { SECTIONS } from "@/financierplan/lib/sections";

export const Route = createFileRoute("/_authenticated/financierplan/nouveau")({
  head: () => ({
    meta: [
      { title: "Nouveau prévisionnel — Previsio" },
      {
        name: "description",
        content:
          "Décrivez votre projet d'entreprise en langage naturel et laissez l'IA bâtir vos 12 volets financiers.",
      },
      { property: "og:title", content: "Nouveau prévisionnel — Previsio" },
      {
        property: "og:description",
        content: "Créez un prévisionnel financier complet à partir de votre idée.",
      },
    ],
  }),
  component: NewProject,
});

const EXAMPLE =
  "J'ouvre un coffee shop de spécialité de 60 m² à Nantes, quartier Graslin, en janvier prochain. Ticket moyen visé 8,50 €, 120 clients/jour en rythme de croisière, ouverture 6 jours/semaine. Je démarre avec 25 000 € d'apport personnel et je cherche un prêt bancaire. Deux salariés à temps plein en année 1, un troisième en année 2. Je vends aussi du café en grains à emporter et j'organise des ateliers dégustation.";

function NewProject() {
  const navigate = useNavigate();
  const create = useServerFn(createProject);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    idea: "",
    sector: "",
    location: "",
    legal_form: "",
    starting_capital: "",
    currency: "EUR",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.idea.trim().length < 20) {
      toast.error("Décrivez votre projet en quelques phrases (20 caractères minimum).");
      return;
    }
    setBusy(true);
    try {
      const res = await create({
        data: {
          name: form.name.trim() || "Nouveau prévisionnel",
          idea: form.idea.trim(),
          sector: form.sector.trim() || null,
          location: form.location.trim() || null,
          legal_form: form.legal_form.trim() || null,
          starting_capital: form.starting_capital ? Number(form.starting_capital) : null,
          currency: form.currency,
        },
      });
      toast.success("Projet créé. Lancement de l'analyse…");
      void navigate({ to: "/financierplan/projet/$id", params: { id: res.id }, search: { auto: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Badge variant="soft">Étape 1 · Votre idée</Badge>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          Décrivez votre projet, l'IA fait le reste
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Plus votre description est précise (prix, volumes, localisation, effectifs, apport), plus
          les {SECTIONS.length} volets financiers seront exacts et défendables devant un banquier.
        </p>
      </motion.div>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card variant="bento" className="p-6">
          <div className="space-y-2">
            <Label htmlFor="idea">Votre projet en langage naturel</Label>
            <Textarea
              id="idea"
              value={form.idea}
              onChange={(e) => set("idea")(e.target.value)}
              placeholder="Activité, offre, clients, prix, volumes, localisation, moyens, calendrier, apport…"
              className="min-h-[280px] resize-none rounded-2xl leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {form.idea.length} caractères
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set("idea")(EXAMPLE)}
              >
                <Wand2 className="size-3.5" /> Voir un exemple
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card variant="bento" className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Café Graslin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur</Label>
              <Input
                id="sector"
                value={form.sector}
                onChange={(e) => set("sector")(e.target.value)}
                placeholder="Restauration / café de spécialité"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Implantation</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location")(e.target.value)}
                placeholder="Nantes, France"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="legal">Forme juridique</Label>
                <Input
                  id="legal"
                  value={form.legal_form}
                  onChange={(e) => set("legal_form")(e.target.value)}
                  placeholder="SASU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capital">Apport (€)</Label>
                <Input
                  id="capital"
                  type="number"
                  min={0}
                  value={form.starting_capital}
                  onChange={(e) => set("starting_capital")(e.target.value)}
                  placeholder="25000"
                />
              </div>
            </div>
          </Card>

          <Button type="submit" variant="holo" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Lancer la construction financière
          </Button>
        </div>
      </form>
    </div>
  );
}
