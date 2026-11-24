import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  Globe,
  Loader2,
  LogOut,
  Plug,
  RefreshCw,
  Search as SearchIcon,
  Sparkles,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/kooky/lib/auth";
import { Logo } from "@/kooky/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/kooky/lib/markdown";
import { runPipeline, type LogEntry } from "@/kooky/lib/pipeline";
import { saveOdooConnection, testOdooConnection } from "@/kooky/lib/kooky.functions";
import { toKyConn, type Database, type KyConn } from "@/kooky/types";
import { ky } from "@/kooky/lib/db";

type Lead = Database["public"]["Tables"]["ky_leads"]["Row"];
type Search = Database["public"]["Tables"]["ky_lead_searches"]["Row"];
type Conn = KyConn;
type Contact = { name?: string; role?: string; email?: string; phone?: string; linkedin?: string };
type Source = { title?: string; url?: string };

export const Route = createFileRoute("/_authenticated/kooky/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord KOOKY — Prospection Odoo" },
      { name: "description", content: "Lancez une recherche de prospects, suivez l'analyse en direct et retrouvez chaque dossier envoyé dans Odoo CRM." },
      { property: "og:title", content: "Tableau de bord KOOKY" },
      { property: "og:description", content: "Recherche de prospects, analyses approfondies et synchronisation Odoo en un seul endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  analyzing: "Analyse en cours",
  analyzed: "Analysé",
  syncing: "Envoi Odoo",
  synced: "Dans Odoo",
  error: "Erreur",
  odoo_error: "Erreur Odoo",
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "synced"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "error" || status === "odoo_error"
        ? "bg-destructive/15 text-destructive"
        : status === "analyzing" || status === "syncing"
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function AppPage() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session === null) navigate({ to: "/auth" });
  }, [session, navigate]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return null;

  return <Dashboard email={session.user.email ?? ""} />;
}

function Dashboard({ email }: { email: string }) {
  const [conn, setConn] = useState<Conn | null | undefined>(undefined);
  const [searches, setSearches] = useState<Search[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const logId = useRef(0);

  const pushLog = useCallback((kind: LogEntry["kind"], text: string, leadId?: string) => {
    setLogs((l) => [...l.slice(-120), { id: ++logId.current, kind, text, at: Date.now(), ...(leadId ? { leadId } : {}) }]);
  }, []);

  // initial load + realtime
  useEffect(() => {
    let alive = true;
    ky(supabase)
      .from("odoo_connections")
      .select("*")
      .maybeSingle()
      .then(({ data }) => alive && setConn(toKyConn(data)));
    ky(supabase)
      .from("ky_lead_searches")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!alive) return;
        setSearches(data ?? []);
        setActiveId((cur) => cur ?? data?.[0]?.id ?? null);
      });

    const ch = supabase
      .channel(`kooky-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ky_lead_searches" }, (p) => {
        const row = p.new as Search;
        setSearches((s) => {
          if (p.eventType === "DELETE") return s.filter((x) => x.id !== (p.old as Search).id);
          const idx = s.findIndex((x) => x.id === row.id);
          return idx === -1 ? [row, ...s] : s.map((x) => (x.id === row.id ? row : x));
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ky_leads" }, (p) => {
        const row = p.new as Lead;
        setLeads((l) => {
          if (p.eventType === "DELETE") return l.filter((x) => x.id !== (p.old as Lead).id);
          const idx = l.findIndex((x) => x.id === row.id);
          const next = idx === -1 ? [...l, row] : l.map((x) => (x.id === row.id ? row : x));
          return next.sort((a, b) => a.position - b.position);
        });
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // leads of the active search
  useEffect(() => {
    if (!activeId) {
      setLeads([]);
      return;
    }
    let alive = true;
    ky(supabase)
      .from("ky_leads")
      .select("*")
      .eq("search_id", activeId)
      .order("position")
      .then(({ data }) => alive && setLeads(data ?? []));
    return () => {
      alive = false;
    };
  }, [activeId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const active = searches.find((s) => s.id === activeId) ?? null;

  const start = useCallback(
    async (searchId: string, leadId?: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setRunning(true);
      if (!leadId) setLogs([]);
      pushLog("status", leadId ? "Reprise de ce prospect…" : "Démarrage de la recherche…");
      try {
        await runPipeline(
          searchId,
          (e) => {
            if (e.type === "status") pushLog("status", e.message, e.leadId);
            if (e.type === "thinking") pushLog("thinking", e.text, e.leadId);
            if (e.type === "search") pushLog("search", e.query, e.leadId);
          },
          ctrl.signal,
          leadId,
        );
        if (!ctrl.signal.aborted) {
          pushLog("done", "Traitement terminé.");
          toast.success("Traitement terminé.");
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const m = err instanceof Error ? err.message : "Erreur inconnue";
        pushLog("error", m);
        toast.error(m);
      } finally {
        if (abortRef.current === ctrl) setRunning(false);
      }
    },
    [pushLog],
  );

  const createSearch = async (payload: { sector: string; location: string; brief: string; target: number }) => {
    const { data, error } = await ky(supabase)
      .from("ky_lead_searches")
      .insert({
        sector: payload.sector,
        location: payload.location || null,
        brief: payload.brief || null,
        target_count: payload.target,
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Création impossible");
      return;
    }
    setSearches((s) => [data, ...s.filter((x) => x.id !== data.id)]);
    setActiveId(data.id);
    setLeads([]);
    void start(data.id);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <OdooCard conn={conn} onChange={setConn} />
          <NewSearchCard disabled={running} onSubmit={createSearch} />
          <SearchListCard searches={searches} activeId={activeId} onSelect={setActiveId} />
        </div>

        <div className="space-y-6">
          {!active ? (
            <div className="surface p-10 text-center text-muted-foreground">
              Lancez votre première recherche pour voir les dossiers apparaître ici.
            </div>
          ) : (
            <>
              <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">{active.sector}</h2>
                  <p className="text-sm text-muted-foreground">
                    {active.location ? `${active.location} · ` : ""}
                    {active.target_count} prospects visés · {leads.filter((l) => l.status === "synced").length} dans Odoo
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={active.status} />
                  {running ? (
                    <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
                      Arrêter
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void start(active.id)}>
                      <RefreshCw className="h-4 w-4" />
                      Relancer
                    </Button>
                  )}
                </div>
              </div>

              {(running || logs.length > 0) && <LiveLog logs={logs} running={running} />}

              <div className="space-y-3">
                {leads.length === 0 && !running && (
                  <div className="surface p-8 text-center text-sm text-muted-foreground">Aucun prospect pour le moment.</div>
                )}
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} busy={running} onRetry={() => void start(lead.search_id, lead.id)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OdooCard({ conn, onChange }: { conn: Conn | null | undefined; onChange: (c: Conn | null) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [db, setDb] = useState("");
  const [login, setLogin] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (conn) {
      setUrl(conn.url);
      setDb(conn.db_name);
      setLogin(conn.login);
      setOpen(false);
    } else if (conn === null) {
      setOpen(true);
    }
  }, [conn]);

  const reload = async () => {
    const { data } = await ky(supabase).from("odoo_connections").select("*").maybeSingle();
    onChange(toKyConn(data));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await saveOdooConnection({ data: { url, db, login, apiKey } });
      if (res.ok) {
        toast.success(res.crmInstalled ? `Connecté à Odoo ${res.version ?? ""}` : "Connecté, mais le module CRM semble absent.");
      } else {
        toast.error(res.error ?? "Connexion impossible");
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await testOdooConnection();
      res.ok ? toast.success(`Odoo ${res.version ?? ""} accessible.`) : toast.error(res.error ?? "Connexion impossible");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test impossible");
    } finally {
      setBusy(false);
    }
  };

  const ok = conn?.status === "ok";

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Connexion Odoo</h2>
        </div>
        {conn && (
          <span className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-400" : "text-destructive"}`}>
            {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {ok ? "Opérationnelle" : conn.status === "no_crm" ? "CRM absent" : "À vérifier"}
          </span>
        )}
      </div>

      {conn && !open && (
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p className="truncate">{conn.url}</p>
          <p className="truncate">
            Base « {conn.db_name} » · {conn.login}
          </p>
          {conn.last_error && <p className="text-destructive">{conn.last_error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={test} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tester
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Modifier
            </Button>
          </div>
        </div>
      )}

      {(open || conn === null) && (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="odoo-url">URL Odoo</Label>
            <Input id="odoo-url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://monentreprise.odoo.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="odoo-db">Nom de la base</Label>
            <Input id="odoo-db" required value={db} onChange={(e) => setDb(e.target.value)} placeholder="monentreprise" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="odoo-login">Email Odoo</Label>
            <Input id="odoo-login" type="email" required value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="odoo-key">Clé API</Label>
            <Input id="odoo-key" type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Connecter
            </Button>
            {conn && (
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Fonctionne avec Odoo en ligne et auto-hébergé. La clé API reste privée.</p>
        </form>
      )}
    </section>
  );
}

function NewSearchCard({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (p: { sector: string; location: string; brief: string; target: number }) => void | Promise<void>;
}) {
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [brief, setBrief] = useState("");
  const [target, setTarget] = useState(5);

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Nouvelle recherche</h2>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ sector: sector.trim(), location: location.trim(), brief: brief.trim(), target });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sector">Secteur d'activité</Label>
          <Input id="sector" required value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Agences d'architecture" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Zone géographique</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Île-de-France (optionnel)" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="target">Nombre de prospects : {target}</Label>
          <input
            id="target"
            type="range"
            min={1}
            max={15}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brief">Précisions</Label>
          <Textarea
            id="brief"
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Ce que vous vendez, votre cible idéale, vos critères d'exclusion…"
          />
        </div>
        <Button type="submit" className="w-full" disabled={disabled || !sector.trim()}>
          <Sparkles className="h-4 w-4" />
          {disabled ? "Traitement en cours…" : "Lancer KOOKY"}
        </Button>
      </form>
    </section>
  );
}

function SearchListCard({
  searches,
  activeId,
  onSelect,
}: {
  searches: Search[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (searches.length === 0) return null;
  return (
    <section className="surface p-5">
      <h2 className="font-display font-semibold">Mes recherches</h2>
      <ul className="mt-3 space-y-1.5">
        {searches.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                s.id === activeId ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="block truncate font-medium text-foreground">{s.sector}</span>
              <span className="block truncate text-xs">
                {s.location ? `${s.location} · ` : ""}
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LiveLog({ logs, running }: { logs: LogEntry[]; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [logs]);

  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        <h3 className="font-display text-sm font-semibold">Travail de KOOKY en direct</h3>
      </div>
      <div ref={ref} className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
        {logs.map((l) => (
          <div key={l.id} className="flex gap-2">
            {l.kind === "search" ? (
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            ) : l.kind === "thinking" ? (
              <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : l.kind === "error" ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            )}
            <span className={l.kind === "thinking" ? "text-muted-foreground" : l.kind === "error" ? "text-destructive" : ""}>
              {l.kind === "search" ? `Recherche web : ${l.text}` : l.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeadCard({ lead, busy, onRetry }: { lead: Lead; busy: boolean; onRetry: () => void }) {
  const [open, setOpen] = useState(false);
  const contacts = (Array.isArray(lead.contacts) ? lead.contacts : []) as Contact[];
  const sources = (Array.isArray(lead.sources) ? lead.sources : []) as Source[];

  return (
    <article className="surface overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-5 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-semibold text-primary">
          {lead.score ?? "–"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display font-semibold">{lead.company_name}</h3>
            <StatusPill status={lead.status} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {[lead.city, lead.country, lead.company_size].filter(Boolean).join(" · ") || lead.sector || "—"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/60 px-5 py-5">
          {lead.error && <p className="text-sm text-destructive">{lead.error}</p>}

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener" className="truncate text-primary hover:underline">
                {lead.website}
              </a>
            )}
            {lead.email && <span className="truncate">{lead.email}</span>}
            {lead.phone && <span>{lead.phone}</span>}
            {(lead.street || lead.zip) && <span className="truncate">{[lead.street, lead.zip, lead.city].filter(Boolean).join(", ")}</span>}
          </div>

          {lead.summary && <div className="prose-kooky" dangerouslySetInnerHTML={{ __html: markdownToHtml(lead.summary) }} />}

          {contacts.length > 0 && (
            <div>
              <h4 className="font-display text-sm font-semibold">Décideurs identifiés</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {contacts.map((c, i) => (
                  <li key={i}>
                    <span className="text-foreground">{c.name}</span>
                    {c.role ? ` — ${c.role}` : ""}
                    {c.email ? ` · ${c.email}` : ""}
                    {c.phone ? ` · ${c.phone}` : ""}
                    {c.linkedin ? (
                      <>
                        {" · "}
                        <a href={c.linkedin} target="_blank" rel="noopener" className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lead.analysis && (
            <div>
              <h4 className="font-display text-sm font-semibold">Analyse détaillée</h4>
              <div className="prose-kooky mt-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(lead.analysis) }} />
            </div>
          )}

          {lead.approach && (
            <div>
              <h4 className="font-display text-sm font-semibold">Plan d'approche</h4>
              <div className="prose-kooky mt-2" dangerouslySetInnerHTML={{ __html: markdownToHtml(lead.approach) }} />
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <h4 className="font-display text-sm font-semibold">Sources</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener" className="text-primary hover:underline">
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRetry} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              {lead.status === "synced" ? "Mettre à jour" : "Relancer ce prospect"}
            </Button>
            {lead.odoo_lead_id && <span className="text-xs text-muted-foreground">Opportunité Odoo #{lead.odoo_lead_id}</span>}
          </div>
        </div>
      )}
    </article>
  );
}
