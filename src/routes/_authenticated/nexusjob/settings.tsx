import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Save, PlugZap, Bot, Gauge, Globe } from "lucide-react";
import { useSession } from "@/nexusjob/hooks/use-session";
import { useSettings, upsertRow } from "@/nexusjob/hooks/use-app-data";
import { testFirecrawl, firecrawlMapTool } from "@/nexusjob/lib/firecrawl.functions";
import { PageContainer, PageHeader } from "@/nexusjob/components/page-header";
import { Card } from "@/nexusjob/components/ui/card";
import { Button } from "@/nexusjob/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/nexusjob/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AI_MODELS, JOB_SOURCES, DEFAULT_SOURCES } from "@/nexusjob/lib/sources";

export const Route = createFileRoute("/_authenticated/nexusjob/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — NexusJob" },
      { name: "description", content: "Connectez votre API Firecrawl, choisissez votre modèle d'IA et réglez le scroll humanisé." },
      { property: "og:title", content: "Paramètres — NexusJob" },
      { property: "og:description", content: "Configuration complète de Firecrawl et des modèles d'IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const list = (v: any): string[] => (Array.isArray(v) ? v : []);

function SettingsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings(user?.id);
  const test = useServerFn(testFirecrawl);
  const mapSite = useServerFn(firecrawlMapTool);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("https://www.welcometothejungle.com");
  const [links, setLinks] = useState<string[]>([]);

  const value = (k: string, fallback: any = "") => draft[k] ?? settings?.[k] ?? fallback;
  const sources: string[] = draft.sources ?? (list(settings?.sources).length ? list(settings?.sources) : DEFAULT_SOURCES);

  const save = async () => {
    if (!user) return;
    setBusy("save");
    try {
      await upsertRow("nxj_settings", user.id, draft);
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["settings", user.id] });
      toast.success("Paramètres enregistrés.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    try {
      const result = await test({});
      result.ok ? toast.success(result.message) : toast.error(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test impossible.");
    } finally {
      setBusy(null);
    }
  };

  const runMap = async () => {
    setBusy("map");
    try {
      const result = await mapSite({ data: { url: mapUrl, search: "emploi", limit: 25 } });
      setLinks(result.links);
      toast.success(`${result.links.length} URL découvertes.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Exploration impossible.");
    } finally {
      setBusy(null);
    }
  };

  const sliders: [string, string, number, number, number, string][] = [
    ["scroll_delay_ms", "Délai entre deux scrolls", 500, 8000, 250, "ms"],
    ["scroll_jitter_ms", "Variation aléatoire (naturel)", 0, 4000, 100, "ms"],
    ["scroll_steps", "Nombre de scrolls par page", 0, 12, 1, ""],
    ["wait_for_ms", "Attente avant lecture", 0, 12000, 500, "ms"],
    ["request_delay_ms", "Pause entre deux sites", 0, 15000, 500, "ms"],
    ["max_pages_per_source", "Pages max par source", 1, 10, 1, ""],
    ["max_rounds", "Tours d'élargissement (pour atteindre le volume demandé)", 1, 5, 1, ""],
    ["deep_scrape_limit", "Lectures approfondies par tour", 0, 20, 1, ""],
    ["scoring_batch_size", "Offres analysées par appel IA", 1, 8, 1, ""],
    ["min_score", "Score minimum conservé", 0, 90, 5, "%"],
    ["fallback_min_score", "Score minimum de repli (offres proches)", 0, 80, 5, "%"],
  ];

  const toggles: [string, string, string][] = [
    ["enforce_region", "Filtrer strictement sur la région", "Écarte les offres qui ne sont pas réellement situées dans la région ciblée."],
    ["dedupe_by_title", "Supprimer les doublons d'intitulé", "Évite d'afficher deux fois la même offre publiée sur plusieurs sites."],
    ["only_main_content", "Ne lire que le contenu principal", "Ignore les menus, bandeaux et pieds de page lors de la lecture."],
    ["respect_robots", "Respecter les règles des sites", "Exploration douce et respectueuse des conditions d'utilisation."],
  ];


  return (
    <PageContainer>
      <PageHeader
        title="Paramètres"
        subtitle="Connexion Firecrawl, modèles d'IA, sources et comportement d'exploration respectueux des sites."
        action={
          <Button variant="holo" onClick={save} disabled={busy !== null || !Object.keys(draft).length}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Enregistrer
          </Button>
        }
      />

      <Tabs defaultValue="firecrawl">
        <TabsList className="rounded-xl">
          <TabsTrigger value="firecrawl"><PlugZap className="mr-1.5 size-4" /> Firecrawl</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="mr-1.5 size-4" /> IA</TabsTrigger>
          <TabsTrigger value="sources"><Globe className="mr-1.5 size-4" /> Sources</TabsTrigger>
          <TabsTrigger value="scroll"><Gauge className="mr-1.5 size-4" /> Exploration</TabsTrigger>
        </TabsList>

        <TabsContent value="firecrawl" className="pt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="holo" className="space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Clé API Firecrawl</h2>
              <p className="text-sm text-muted-foreground">
                Créez une clé sur firecrawl.dev (format <code>fc-…</code>). Elle est stockée de façon
                privée et n'est utilisée que pour vos propres recherches.
              </p>
              <div className="space-y-1.5">
                <Label>Clé API</Label>
                <Input type="password" placeholder="fc-..." value={value("firecrawl_api_key")} onChange={(e) => setDraft((d) => ({ ...d, firecrawl_api_key: e.target.value }))} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="accent" onClick={runTest} disabled={busy !== null}>
                  {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Tester la connexion
                </Button>
                {settings?.firecrawl_api_key && <Badge variant="live">Clé enregistrée</Badge>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Pays de recherche</Label>
                  <Input value={value("country", "FR")} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value.toUpperCase() }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode proxy</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-white/60 px-3 text-sm" value={value("proxy_mode", "auto")} onChange={(e) => setDraft((d) => ({ ...d, proxy_mode: e.target.value }))}>
                    {["auto", "basic", "stealth"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/40 px-3 py-2">
                <span className="text-sm">Contenu principal uniquement</span>
                <Switch checked={Boolean(value("only_main_content", true))} onCheckedChange={(v) => setDraft((d) => ({ ...d, only_main_content: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/40 px-3 py-2">
                <span className="text-sm">Respecter robots.txt</span>
                <Switch checked={Boolean(value("respect_robots", true))} onCheckedChange={(v) => setDraft((d) => ({ ...d, respect_robots: v }))} />
              </div>
            </Card>

            <Card variant="bento" className="space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Outil Map — découverte d'URLs</h2>
              <div className="flex gap-2">
                <Input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} />
                <Button variant="nxj-glass" onClick={runMap} disabled={busy !== null}>
                  {busy === "map" ? <Loader2 className="size-4 animate-spin" /> : "Explorer"}
                </Button>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto scroll-thin text-xs">
                {links.map((l) => (
                  <a key={l} href={l} target="_blank" rel="noreferrer" className="block truncate rounded-lg bg-white/40 px-2 py-1 hover:bg-white/70">{l}</a>
                ))}
                {!links.length && <p className="text-muted-foreground">Aucune URL découverte pour l'instant.</p>}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="pt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ["ai_model", "Modèle d'analyse & scoring des offres"],
              ["ai_extraction_model", "Modèle d'extraction CV / lettre"],
            ].map(([key, title]) => (
              <Card key={key} variant="bento" className="p-6">
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <div className="mt-4 space-y-2">
                  {AI_MODELS.map((m) => {
                    const active = value(key, "google/gemini-3.5-flash") === m.id;
                    return (
                      <button key={m.id} onClick={() => setDraft((d) => ({ ...d, [key]: m.id }))} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-nxj-holo-2 text-primary-foreground" : "bg-white/40 hover:bg-white/70"}`}>
                        <span>{m.label}</span>
                        <span className={`text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>{m.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="pt-5">
          <Card variant="bento" className="grid gap-3 p-6 md:grid-cols-2">
            {JOB_SOURCES.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/40 px-4 py-3">
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <Switch
                  checked={sources.includes(s.id)}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, sources: v ? [...sources, s.id] : sources.filter((x) => x !== s.id) }))
                  }
                />
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="scroll" className="pt-5">
          <Card variant="holo" className="space-y-6 p-6">
            <p className="text-sm text-muted-foreground">
              Ces réglages rendent l'exploration naturelle : scrolls espacés, variations aléatoires et
              pauses entre les sites, pour respecter les serveurs et éviter tout blocage.
            </p>
            {sliders.map(([key, lab, min, max, step, unit]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>{lab}</Label>
                  <Badge variant="nxj-glass">{value(key, min)}{unit}</Badge>
                </div>
                <Slider min={min} max={max} step={step} value={[Number(value(key, min))]} onValueChange={([v]) => setDraft((d) => ({ ...d, [key]: v }))} />
              </div>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              {toggles.map(([key, lab, hint]) => (
                <div key={key} className="flex items-start justify-between gap-3 rounded-xl bg-white/40 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{lab}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Switch checked={Boolean(value(key, true))} onCheckedChange={(v) => setDraft((d) => ({ ...d, [key]: v }))} />
                </div>
              ))}
            </div>

          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
