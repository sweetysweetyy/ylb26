import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bp } from "@/businessplan/lib/db";
import { analyzePlan } from "@/businessplan/lib/plans.functions";
import { PageHeader } from "@/businessplan/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/businessplan/nouveau")({
  head: () => ({
    meta: [
      { title: "Importer un business plan — Plan Studio" },
      { name: "description", content: "Importez votre business plan PDF : l'IA l'analyse et le reconstruit en dossier professionnel." },
      { property: "og:title", content: "Importer un business plan" },
      { property: "og:description", content: "Analyse et reconstruction automatique de votre business plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewPlan,
});

const STEPS = [
  "Envoi sécurisé du document",
  "Extraction du texte et des tableaux",
  "Analyse financière des données",
  "Reconstruction éditoriale",
  "Contrôle qualité automatique",
];

function NewPlan() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzePlan);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);

  function pick(next: File | null | undefined) {
    if (!next) return;
    if (next.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (next.size > 18 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (18 Mo maximum).");
      return;
    }
    setFile(next);
    if (!title) setTitle(next.name.replace(/\.pdf$/i, ""));
  }

  async function start() {
    if (!file) return;
    setBusy(true);
    setStep(0);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Session expirée.");

      const path = `${userId}/${crypto.randomUUID()}.pdf`;
      const upload = await supabase.storage.from("businessplan-files").upload(path, file, {
        contentType: "application/pdf",
      });
      if (upload.error) throw upload.error;

      const { data: plan, error } = await bp()
        .from("bp_plans")
        .insert({
          user_id: userId,
          title: title || file.name.replace(/\.pdf$/i, ""),
          status: "uploaded",
          source_filename: file.name,
          source_path: path,
        })
        .select()
        .single();
      if (error) throw error;

      setStep(1);
      const timers = [
        setTimeout(() => setStep(2), 4000),
        setTimeout(() => setStep(3), 14000),
        setTimeout(() => setStep(4), 30000),
      ];
      try {
        await analyze({ data: { planId: plan.id } });
      } finally {
        timers.forEach(clearTimeout);
      }

      toast.success("Business plan reconstruit avec succès.");
      navigate({ to: "/businessplan/plan/$id", params: { id: plan.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'analyse a échoué.");
      setStep(-1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      <PageHeader title="Nouveau business plan" subtitle="Importez votre PDF, l'IA s'occupe du reste." />

      <div className="grid gap-5 px-8 py-7 lg:grid-cols-[1.4fr_1fr]">
        <section className="bp-card p-7">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/20",
            )}
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileUp className="h-6 w-6" />
              <span className="absolute inset-0 -z-10 bp-pulse rounded-2xl bg-accent blur-lg" />
            </span>
            <p className="mt-5 font-display text-base font-semibold">
              {file ? file.name : "Déposez votre business plan PDF"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {file ? `${(file.size / 1024 / 1024).toFixed(1)} Mo — cliquez pour changer` : "ou cliquez pour parcourir (18 Mo max)"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>

          <div className="mt-6 space-y-1.5">
            <Label htmlFor="title">Nom du projet</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Business Plan — Ma société" />
          </div>

          <Button className="mt-6 w-full" size="lg" disabled={!file || busy} onClick={start}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Lancer l'analyse et la reconstruction
              </>
            )}
          </Button>

          {step >= 0 && (
            <div className="mt-7">
              <Progress value={((step + 1) / STEPS.length) * 100} />
              <ul className="mt-4 space-y-2">
                {STEPS.map((label, i) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2.5 text-sm transition-colors",
                      i < step ? "text-muted-foreground" : i === step ? "font-medium text-foreground" : "text-muted-foreground/50",
                    )}
                  >
                    {i === step ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <span className={cn("h-1.5 w-1.5 rounded-full", i < step ? "bg-primary" : "bg-border")} />
                    )}
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="bp-card h-fit p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold">Fidélité garantie</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            L'IA n'invente aucun chiffre. Elle restructure, reformule et met en valeur uniquement les informations
            réellement présentes dans votre document. Les données manquantes sont signalées dans le rapport qualité.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Tableaux reconstruits en tableaux dynamiques",
              "Graphiques générés à partir de vos chiffres",
              "Structure attendue par les financeurs",
              "Fichier source stocké de façon privée",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
