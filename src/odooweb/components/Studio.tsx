import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { ow } from "@/odooweb/lib/db";

const supabase = baseSupabase;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { connectOdoo, generatePlan, publishSite } from "@/odooweb/lib/studio.functions";
import {
  FEATURES,
  PALETTES,
  TYPOGRAPHIES,
  type Brief,
  type SitePlan,
  type StyleOptions,
} from "@/odooweb/lib/site-plan";


type ConnectionRow = {
  id: string;
  name: string;
  url: string;
  db_name: string;
  version: string | null;
};

type LogRow = { id: string; message: string; detail: string | null; created_at: string };

const DENSITIES = [
  { key: "aeree", label: "Aérée" },
  { key: "equilibree", label: "Équilibrée" },
  { key: "dense", label: "Dense" },
];

export function Studio() {
  const [ready, setReady] = useState(false);

  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", db: "", login: "", apiKey: "" });
  const [connecting, setConnecting] = useState(false);

  const [brief, setBrief] = useState<Brief>({
    company: "",
    sector: "",
    goal: "Générer des demandes de contact",
    tone: "Sobre et expert",
    description: "",
    pages: 5,
    features: ["formulaire"],
  });

  const [style, setStyle] = useState<StyleOptions>({
    palette: "terre",
    primary: PALETTES["terre"]!.primary,
    background: PALETTES["terre"]!.background,
    text: PALETTES["terre"]!.text,
    typography: "grotesque",
    density: "equilibree",
    imagery: "lumière naturelle, textures brutes",
    withImages: true,
  });

  const [projectId, setProjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ title: string; url: string }[]>([]);

  const runConnect = useServerFn(connectOdoo);
  const runPlan = useServerFn(generatePlan);
  const runPublish = useServerFn(publishSite);

  const loadConnections = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const { data } = await supabase.from("odoo_connections").select("url, db").maybeSingle();
    const rows: ConnectionRow[] = data && auth.user
      ? [{ id: auth.user.id, name: "Odoo (Laboratoire)", url: data.url, db_name: data.db, version: null }]
      : [];
    setConnections(rows);
    if (rows[0]) setConnectionId(rows[0].id);
  }, []);

  useEffect(() => {
    setReady(true);
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`build-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ow_build_logs", filter: `project_id=eq.${projectId}` },
        (payload) => setLogs((current) => [...current, payload.new as LogRow]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ow_site_projects", filter: `id=eq.${projectId}` },
        (payload) => setProgress((payload.new as { progress: number }).progress ?? 0),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  const activeConnection = useMemo(
    () => connections.find((c) => c.id === connectionId) ?? null,
    [connections, connectionId],
  );

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setConnecting(true);
    try {
      const result = await runConnect({ data: form });
      toast.success(`Base connectée (Odoo ${result.version})`);
      setForm({ name: "", url: "", db: "", login: "", apiKey: "" });
      await loadConnections();
      setConnectionId((result.connection as { id: string }).id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion Odoo impossible");
    } finally {
      setConnecting(false);
    }
  };

  const handlePlan = async () => {
    if (!connectionId) { toast.error("Connectez d'abord votre base Odoo."); return; }
    if (!brief.company.trim() || !brief.description.trim()) {
      toast.error("Renseignez le nom de l'entreprise et la description.");
      return;
    }

    setThinking(true);
    setLogs([]);
    setPublished([]);
    try {
      const { data: session } = await supabase.auth.getUser();
      const { data: project, error } = await ow(supabase)
        .from("ow_site_projects")
        .insert({
          user_id: session.user!.id,
          name: brief.company,
          brief,
          style,
          status: "analyzing",
          progress: 10,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      setProjectId(project.id);
      setProgress(20);
      const result = await runPlan({ data: { projectId: project.id } });
      setPlan(result);
      setProgress(40);
      toast.success("Plan du site généré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse impossible");
    } finally {
      setThinking(false);
    }
  };

  const handlePublish = async () => {
    if (!projectId) return;
    setPublishing(true);
    try {
      const result = await runPublish({ data: { projectId } });
      setPublished(result.pages);
      toast.success("Site publié dans Odoo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication impossible");
    } finally {
      setPublishing(false);
    }
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="label-mono">Chargement de l'atelier…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4">
          <span className="grid size-7 place-items-center rounded-md bg-primary font-display text-[13px] font-bold text-primary-foreground">
            O
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Odoo Site Studio</p>
            <p className="label-mono hidden sm:block">Propulsé par GPT 5.6 Sol</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activeConnection ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent sm:inline-flex">
                <span className="size-1.5 rounded-full bg-accent" />
                {activeConnection.db_name}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign("/auth");
              }}
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 px-4 py-5 lg:grid-cols-12">
        {/* Colonne 1 : connexion + brief */}
        <section className="space-y-4 lg:col-span-4">
          <article className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="label-mono">01 · Base Odoo</span>
              {activeConnection ? (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  Connectée
                </span>
              ) : null}
            </div>

            {connections.length > 0 ? (
              <div className="mb-3 space-y-1.5">
                {connections.map((connection) => (
                  <button
                    key={connection.id}
                    type="button"
                    onClick={() => setConnectionId(connection.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      connection.id === connectionId ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate font-medium">{connection.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {connection.version ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <form onSubmit={handleConnect} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nom de l'instance"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  placeholder="Base (db)"
                  value={form.db}
                  required
                  onChange={(e) => setForm({ ...form, db: e.target.value })}
                />
              </div>
              <Input
                placeholder="https://monentreprise.odoo.com"
                value={form.url}
                required
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Identifiant"
                  value={form.login}
                  required
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder="Clé API"
                  value={form.apiKey}
                  required
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={connecting}>
                {connecting ? "Vérification…" : "Connecter la base"}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                La clé API se crée dans Odoo depuis votre profil, onglet Sécurité du compte. Un compte
                administrateur est nécessaire pour installer les modules.
              </p>
            </form>
          </article>

          <article className="rounded-xl border bg-card p-4">
            <span className="label-mono">02 · Brief</span>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Entreprise</Label>
                  <Input
                    value={brief.company}
                    onChange={(e) => setBrief({ ...brief, company: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secteur</Label>
                  <Input
                    value={brief.sector}
                    onChange={(e) => setBrief({ ...brief, sector: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ce que le site doit raconter</Label>
                <Textarea
                  rows={4}
                  value={brief.description}
                  placeholder="Atelier de fabrication sur mesure depuis 1998, clients industriels, savoir-faire soudure et usinage…"
                  onChange={(e) => setBrief({ ...brief, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Objectif</Label>
                  <Input value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ton</Label>
                  <Input value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre de pages : {brief.pages}</Label>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={brief.pages}
                  onChange={(e) => setBrief({ ...brief, pages: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
              <div>
                <Label className="text-xs">Modules Odoo à activer</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(FEATURES).map(([key, feature]) => {
                    const active = brief.features.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setBrief({
                            ...brief,
                            features: active
                              ? brief.features.filter((f) => f !== key)
                              : [...brief.features, key],
                          })
                        }
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {feature.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* Colonne 2 : style + plan */}
        <section className="space-y-4 lg:col-span-5">
          <article className="rounded-xl border bg-card p-4">
            <span className="label-mono">03 · Style visuel</span>
            <div className="mt-3 space-y-3">
              <div>
                <Label className="text-xs">Palette</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {Object.entries(PALETTES).map(([key, palette]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setStyle({
                          ...style,
                          palette: key,
                          primary: palette.primary,
                          background: palette.background,
                          text: palette.text,
                        })
                      }
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        style.palette === key ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <span className="flex -space-x-1">
                        <span
                          className="size-4 rounded-full ring-2 ring-card"
                          style={{ background: palette.primary }}
                        />
                        <span
                          className="size-4 rounded-full ring-2 ring-card"
                          style={{ background: palette.background }}
                        />
                        <span
                          className="size-4 rounded-full ring-2 ring-card"
                          style={{ background: palette.text }}
                        />
                      </span>
                      <span className="text-xs font-medium">{palette.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Typographie</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(TYPOGRAPHIES).map(([key, typo]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStyle({ ...style, typography: key })}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                          style.typography === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {typo.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Densité</Label>
                  <div className="mt-1.5 flex gap-1.5">
                    {DENSITIES.map((density) => (
                      <button
                        key={density.key}
                        type="button"
                        onClick={() => setStyle({ ...style, density: density.key })}
                        className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
                          style.density === density.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {density.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ambiance des visuels</Label>
                <Input
                  value={style.imagery}
                  onChange={(e) => setStyle({ ...style, imagery: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={style.withImages}
                  onChange={(e) => setStyle({ ...style, withImages: e.target.checked })}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Générer une image par page et l'envoyer dans Odoo
              </label>

              <Button className="w-full" onClick={handlePlan} disabled={thinking}>
                {thinking ? "L'IA analyse votre demande…" : "Analyser et composer le site"}
              </Button>
            </div>
          </article>

          <article className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="label-mono">04 · Plan du site</span>
              {plan ? (
                <span className="font-mono text-[10px] text-muted-foreground">{plan.pages.length} pages</span>
              ) : null}
            </div>
            {plan ? (
              <>
                <p className="font-display text-lg font-semibold">{plan.site_name}</p>
                <p className="mb-3 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="divide-y">
                  {plan.pages.map((page, index) => (
                    <li key={page.slug} className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-sm font-medium">{page.title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{page.slug}</span>
                      </div>
                      <p className="mt-1 pl-6 text-xs leading-relaxed text-muted-foreground">{page.summary}</p>
                    </li>
                  ))}
                </ul>
                <Button className="mt-3 w-full" onClick={handlePublish} disabled={publishing}>
                  {publishing ? "Construction dans Odoo…" : "Publier dans le module Site Web"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Décrivez votre projet à gauche, choisissez un style, puis lancez l'analyse. L'IA propose une
                arborescence complète avec les textes de chaque section.
              </p>
            )}
          </article>
        </section>

        {/* Colonne 3 : progression */}
        <section className="space-y-4 lg:col-span-3">
          <article className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="label-mono">05 · Publication</span>
              <span className="font-mono text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4">
              <span className="label-mono">Journal en direct</span>
              <ul className="mt-2 space-y-2 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <li className="text-muted-foreground">En attente d'une première étape…</li>
                ) : (
                  logs.map((entry) => (
                    <li key={entry.id} className="flex gap-2">
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="truncate">{entry.message}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {published.length > 0 && activeConnection ? (
              <div className="mt-4 border-t pt-3">
                <span className="label-mono">Pages en ligne</span>
                <ul className="mt-1.5 space-y-1">
                  {published.map((page) => (
                    <li key={page.url}>
                      <a
                        href={`${activeConnection.url}${page.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-primary hover:underline"
                      >
                        {page.url} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
