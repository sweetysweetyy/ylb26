import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radar, Loader2, Save } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { usePreferences, useSettings, useSearches, upsertRow } from "@/nexusjob/hooks/use-app-data";
import { runJobSearch } from "@/nexusjob/lib/search.functions";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Button } from "@/nexusjob/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/nexusjob/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { JOB_SOURCES, CONTRACT_TYPES, REMOTE_OPTIONS, DEFAULT_SOURCES, SECTORS, FLEXIBILITY_OPTIONS, FRESHNESS_OPTIONS, REUNION_LOCATIONS } from "@/nexusjob/lib/sources";

export const Route = createFileRoute("/_authenticated/nexusjob/search")({
  head: () => ({
    meta: [
      { title: "Recherche d'offres — NexusJob" },
      { name: "description", content: "Définissez le poste visé et lancez une exploration multi-sites avec scoring IA." },
      { property: "og:title", content: "Recherche d'offres — NexusJob" },
      { property: "og:description", content: "Exploration Firecrawl multi-sites et scoring de compatibilité IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

const list = (v: any): string[] => (Array.isArray(v) ? v : []);

function SearchPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: prefs } = usePreferences(user?.id);
  const { data: settings } = useSettings(user?.id);
  const { data: searches = [] } = useSearches(user?.id);
  const run = useServerFn(runJobSearch);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const value = (k: string) => draft[k] ?? prefs?.[k] ?? "";
  const arr = (k: string) => list(draft[k] ?? prefs?.[k]);
  const sources: string[] = list(settings?.sources).length ? list(settings?.sources) : DEFAULT_SOURCES;

  const savePrefs = async () => {
    if (!user) return;
    setBusy("save");
    try {
      await upsertRow("nxj_preferences", user.id, draft);
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["preferences", user.id] });
      toast.success("Préférences enregistrées.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const launch = async () => {
    if (!user) return;
    if (Object.keys(draft).length) await upsertRow("nxj_preferences", user.id, draft).catch(() => {});
    setBusy("run");
    try {
      const result = await run({ data: { sources, brief: (draft.brief ?? prefs?.brief ?? "") as string } });
      toast.success(`${result.count} offre(s) analysée(s) — score moyen ${Math.round(result.avgScore ?? 0)}%.`);
      queryClient.invalidateQueries({ queryKey: ["offers", user.id] });
      queryClient.invalidateQueries({ queryKey: ["searches", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recherche impossible.");
    } finally {
      setBusy(null);
    }
  };

  const toggleInArray = (key: string, item: string) => {
    const current = arr(key);
    setDraft((d) => ({
      ...d,
      [key]: current.includes(item) ? current.filter((x) => x !== item) : [...current, item],
    }));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Recherche d'offres"
        subtitle="L'IA génère les requêtes, Firecrawl explore les sites avec un scroll humanisé, puis chaque offre est notée."
        action={
          <Button variant="holo" size="lg" onClick={launch} disabled={busy !== null}>
            {busy === "run" ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />} Rechercher
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="bento" className="space-y-5 p-6 lg:col-span-2">
          <div className="space-y-1.5">
            <Label>Décrivez votre recherche en langage naturel</Label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-white/60 bg-white/60 p-3 text-sm"
              placeholder="Ex : je cherche un poste de conducteur de travaux dans le BTP à Saint-Pierre, CDI, avec de l'autonomie. J'évite les postes de nuit."
              value={value("brief")}
              onChange={(e) => setDraft((d) => ({ ...d, brief: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              L'IA lit votre description et configure elle-même Firecrawl (requêtes, fraîcheur, proxy, scroll) pour cibler les bonnes offres.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Poste recherché (facultatif)</Label>
              <Input placeholder="Ex : Développeur full-stack" value={value("target_role")} onChange={(e) => setDraft((d) => ({ ...d, target_role: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur d'activité</Label>
              <select
                className="h-10 w-full rounded-xl border border-white/60 bg-white/60 px-3 text-sm"
                value={value("sector")}
                onChange={(e) => setDraft((d) => ({ ...d, sector: e.target.value }))}
              >
                <option value="">— Aucun (déduit du profil) —</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Région ciblée</Label>
              <Input value={value("region") || "La Réunion"} onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre minimum d'offres</Label>
              <Input type="number" min={1} max={60} value={value("min_results") || 10} onChange={(e) => setDraft((d) => ({ ...d, min_results: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Salaire minimum (€/an)</Label>
              <Input type="number" value={value("min_salary")} onChange={(e) => setDraft((d) => ({ ...d, min_salary: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Séniorité visée</Label>
              <Input placeholder="junior, confirmé, senior…" value={value("seniority")} onChange={(e) => setDraft((d) => ({ ...d, seniority: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Communes ciblées (séparées par des virgules)</Label>
              <Input value={arr("locations").join(", ")} onChange={(e) => setDraft((d) => ({ ...d, locations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mots-clés</Label>
              <Input value={arr("keywords").join(", ")} onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>À exclure</Label>
              <Input value={arr("exclusions").join(", ")} onChange={(e) => setDraft((d) => ({ ...d, exclusions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fraîcheur des offres</Label>
              <select
                className="h-10 w-full rounded-xl border border-white/60 bg-white/60 px-3 text-sm"
                value={value("freshness") || "any"}
                onChange={(e) => setDraft((d) => ({ ...d, freshness: e.target.value }))}
              >
                {FRESHNESS_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {REUNION_LOCATIONS.map((c) => (
              <button key={c} onClick={() => toggleInArray("locations", c)}>
                <Badge variant={arr("locations").includes(c) ? "holo" : "nxj-glass"} className="py-1">{c}</Badge>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Souplesse de la recherche</Label>
            <div className="flex flex-wrap gap-2">
              {FLEXIBILITY_OPTIONS.map((f) => (
                <button key={f.id} onClick={() => setDraft((d) => ({ ...d, flexibility: f.id }))} title={f.hint}>
                  <Badge variant={(value("flexibility") || "balanced") === f.id ? "holo" : "nxj-glass"} className="py-1">{f.label}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Types de contrat</Label>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPES.map((c) => (
                <button key={c} onClick={() => toggleInArray("contract_types", c)}>
                  <Badge variant={arr("contract_types").includes(c) ? "holo" : "nxj-glass"} className="py-1">{c}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Télétravail</Label>
            <div className="flex flex-wrap gap-2">
              {REMOTE_OPTIONS.map((r) => (
                <button key={r.id} onClick={() => setDraft((d) => ({ ...d, remote: r.id }))}>
                  <Badge variant={value("remote") === r.id ? "holo" : "nxj-glass"} className="py-1">{r.label}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/40 px-3 py-2 text-sm">
              <span>Rester strictement dans la région</span>
              <Switch
                checked={(draft.region_strict ?? prefs?.region_strict ?? true) as boolean}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, region_strict: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/40 px-3 py-2 text-sm">
              <span>Accepter les offres proches / même secteur</span>
              <Switch
                checked={(draft.include_similar ?? prefs?.include_similar ?? true) as boolean}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, include_similar: v }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Consignes libres pour l'IA</Label>
            <Input placeholder="Ex : privilégier les entreprises du bâtiment à Saint-Pierre" value={value("notes")} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>

          <Button variant="nxj-glass" onClick={savePrefs} disabled={busy !== null || !Object.keys(draft).length}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer les critères
          </Button>
        </Card>


        <div className="space-y-4">
          <Card variant="holo" className="p-6">
            <h2 className="font-display text-lg font-semibold">Sources explorées</h2>
            <p className="mt-1 text-xs text-muted-foreground">Modifiable dans Paramètres.</p>
            <div className="mt-4 space-y-2.5">
              {JOB_SOURCES.filter((s) => sources.includes(s.id)).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2 text-sm">
                  <span>{s.label}</span>
                  <Switch checked disabled />
                </div>
              ))}
            </div>
          </Card>

          <Card variant="bento" className="p-6">
            <h2 className="font-display text-lg font-semibold">Historique</h2>
            <div className="mt-3 space-y-2">
              {searches.slice(0, 6).map((s) => (
                <div key={s.id} className="rounded-xl bg-white/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.query}</span>
                    <Badge variant={s.status === "done" ? "live" : s.status === "error" ? "destructive" : "soft"}>
                      {s.status === "done" ? `${s.results_count}` : s.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!searches.length && <p className="text-sm text-muted-foreground">Aucune recherche pour l'instant.</p>}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
