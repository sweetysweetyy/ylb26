import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Palette, Printer, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bp } from "@/businessplan/lib/db";
import { refineSection } from "@/businessplan/lib/plans.functions";
import { PageHeader } from "@/businessplan/components/AppShell";
import { PlanStatusBadge } from "@/businessplan/components/PlanStatusBadge";
import { BrandEditor } from "@/businessplan/components/plan/BrandEditor";
import { DocumentRenderer } from "@/businessplan/components/plan/DocumentRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_BRAND, isPlanContent, type Brand, type PlanContent, type Quality } from "@/businessplan/lib/plan-schema";

export const Route = createFileRoute("/_authenticated/businessplan/plan/$id")({
  head: () => ({
    meta: [
      { title: "Éditeur de business plan — Plan Studio" },
      { name: "description", content: "Affinez chaque section, personnalisez la charte graphique et exportez votre business plan en PDF." },
      { property: "og:title", content: "Éditeur de business plan" },
      { property: "og:description", content: "Édition assistée par IA et export PDF professionnel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanEditor,
});

function PlanEditor() {
  const { id } = Route.useParams();
  const refine = useServerFn(refineSection);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [instruction, setInstruction] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  const { data: plan, refetch } = useQuery({
    queryKey: ["bp-plan", id],
    queryFn: async () => {
      const { data, error } = await bp().from("bp_plans").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.status === "processing" ? 4000 : false),
  });

  useEffect(() => {
    if (plan?.brand) setBrand({ ...DEFAULT_BRAND, ...(plan.brand as Partial<Brand>) });
  }, [plan?.brand]);

  const content: PlanContent | null = isPlanContent(plan?.content) ? plan.content : null;
  const quality = (plan?.quality ?? null) as Quality | null;

  useEffect(() => {
    const firstSection = content?.sections[0];
    if (!activeSection && firstSection) setActiveSection(firstSection.id);
  }, [content, activeSection]);

  const sections = useMemo(() => content?.sections ?? [], [content]);

  async function saveBrand() {
    setSavingBrand(true);
    const { error } = await bp().from("bp_plans").update({ brand }).eq("id", id);
    setSavingBrand(false);
    if (error) toast.error("Enregistrement impossible");
    else toast.success("Charte graphique enregistrée");
  }

  async function applyRefine() {
    if (!activeSection || instruction.trim().length < 3) return;
    setPending(true);
    try {
      await refine({ data: { planId: id, sectionId: activeSection, instruction } });
      setInstruction("");
      await refetch();
      toast.success("Section améliorée");
    } catch {
      toast.error("L'amélioration a échoué");
    } finally {
      setPending(false);
    }
  }

  if (!plan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <PageHeader
        title={plan.title}
        subtitle={plan.source_filename ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <PlanStatusBadge status={plan.status} />
            <Button variant="outline" onClick={() => window.open(`/businessplan/impression/${id}`, "_blank")}>
              <Printer className="mr-1.5 h-4 w-4" /> Exporter en PDF
            </Button>
          </div>
        }
      />

      {plan.status === "error" && (
        <div className="mx-8 mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <span>{plan.error_message ?? "L'analyse a échoué."}</span>
        </div>
      )}

      <div className="px-8 py-7">
        <Tabs defaultValue="apercu">
          <TabsList>
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="qualite">Qualité</TabsTrigger>
            <TabsTrigger value="branding">Identité</TabsTrigger>
          </TabsList>

          <TabsContent value="apercu" className="mt-6">
            {content ? (
              <div className="bp-card overflow-hidden p-6">
                <DocumentRenderer content={content} brand={brand} />
              </div>
            ) : (
              <EmptyState status={plan.status} />
            )}
          </TabsContent>

          <TabsContent value="sections" className="mt-6">
            {sections.length ? (
              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <nav className="bp-card h-fit space-y-1 p-3">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeSection === s.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                </nav>

                <div className="bp-card p-6">
                  {sections
                    .filter((s) => s.id === activeSection)
                    .map((s) => (
                      <div key={s.id}>
                        <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                        {s.summary && <p className="mt-1.5 text-sm text-muted-foreground">{s.summary}</p>}
                        <p className="mt-4 text-xs text-muted-foreground">
                          {s.blocks.length} bloc{s.blocks.length > 1 ? "s" : ""} de contenu
                        </p>
                        <div className="mt-6 rounded-xl border border-border/70 bg-card/50 p-4">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="h-4 w-4 text-primary" /> Améliorer cette section
                          </label>
                          <div className="mt-3 flex gap-2">
                            <Input
                              value={instruction}
                              onChange={(e) => setInstruction(e.target.value)}
                              placeholder="Ex : ajoute un graphique d'évolution du chiffre d'affaires"
                            />
                            <Button onClick={applyRefine} disabled={pending}>
                              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            L'IA reste strictement fidèle aux données de votre document source.
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <EmptyState status={plan.status} />
            )}
          </TabsContent>

          <TabsContent value="qualite" className="mt-6">
            {quality ? (
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="bp-card p-6 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Score global</p>
                  <p className="mt-2 font-display text-5xl font-semibold">{quality.score}</p>
                  <p className="text-xs text-muted-foreground">sur 100</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${quality.score}%` }} />
                  </div>
                </div>
                <div className="bp-card space-y-4 p-6">
                  {!!quality.strengths?.length && (
                    <div>
                      <h4 className="text-sm font-semibold">Points forts</h4>
                      <ul className="mt-2 space-y-1.5">
                        {quality.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!quality.issues?.length && (
                    <div>
                      <h4 className="text-sm font-semibold">Points d'attention</h4>
                      <ul className="mt-2 space-y-1.5">
                        {quality.issues.map((issue, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <AlertTriangle
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                issue.severity === "critical" ? "text-destructive" : "text-muted-foreground"
                              }`}
                            />
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!quality.missing?.length && (
                    <div>
                      <h4 className="text-sm font-semibold">Informations manquantes</h4>
                      <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                        {quality.missing.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState status={plan.status} />
            )}
          </TabsContent>

          <TabsContent value="branding" className="mt-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
              <div className="bp-card h-fit p-6">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Identité visuelle</h3>
                </div>
                <div className="mt-5">
                  <BrandEditor brand={brand} onChange={setBrand} />
                </div>
                <Button className="mt-6 w-full" onClick={saveBrand} disabled={savingBrand}>
                  {savingBrand ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Enregistrer
                </Button>
              </div>
              <div className="bp-card overflow-hidden p-6">
                {content ? (
                  <DocumentRenderer content={content} brand={brand} paged={false} />
                ) : (
                  <EmptyState status={plan.status} />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="bp-card flex flex-col items-center py-20 text-center">
      {status === "processing" ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Analyse du document en cours…</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun contenu reconstruit pour l'instant.</p>
      )}
    </div>
  );
}
