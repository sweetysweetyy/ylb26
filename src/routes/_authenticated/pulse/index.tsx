import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Activity, Mic, MicOff, RefreshCw, Settings, LogOut, Send, Volume2, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pls } from "@/pulse/lib/db";
import { askDashboard, loadDemo, syncOdoo } from "@/pulse/lib/odoo.functions";
import { fmt, type Snapshot, type Tone } from "@/pulse/lib/kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/pulse/")({
  head: () => ({
    meta: [
      { title: "Cockpit — Pulse" },
      { name: "description", content: "Santé économique de votre entreprise en temps réel, avec analyste vocal." },
      { property: "og:title", content: "Cockpit — Pulse" },
      { property: "og:description", content: "KPI dynamiques Odoo et analyste vocal IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type HL = Record<string, Tone>;
const toneText: Record<Tone, string> = { positive: "text-pls-positive", warning: "text-pls-warning", critical: "text-pls-critical", info: "text-pls-info" };
const toneBg: Record<Tone, string> = { positive: "bg-pls-positive", warning: "bg-pls-warning", critical: "bg-pls-critical", info: "bg-pls-info" };

function useUserId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setId(data.user?.id ?? null));
  }, []);
  return id;
}

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = useUserId();
  const sync = useServerFn(syncOdoo);
  const demo = useServerFn(loadDemo);
  const [busy, setBusy] = useState(false);
  const [hl, setHl] = useState<HL>({});

  const snapQ = useQuery({
    queryKey: ["snapshot"],
    queryFn: async () => {
      const { data } = await pls(supabase).from("pls_kpi_snapshots").select("data, source, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data ? { snap: data.data as unknown as Snapshot, source: data.source, at: data.created_at } : null;
    },
  });
  const connQ = useQuery({
    queryKey: ["conn"],
    queryFn: async () => (await supabase.from("odoo_connections").select("url, db").maybeSingle()).data,
  });

  // Realtime: refresh when a new snapshot / message lands (other tabs, devices).
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`pls-dash-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pls_kpi_snapshots", filter: `user_id=eq.${userId}` }, () => qc.invalidateQueries({ queryKey: ["snapshot"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pls_chat_messages", filter: `user_id=eq.${userId}` }, () => qc.invalidateQueries({ queryKey: ["messages"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const s = snapQ.data?.snap;
  const dim = Object.keys(hl).length > 0;

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-28 md:px-6 lg:pb-8">
      <header className="flex flex-wrap items-center gap-3 py-5">
        <Link to="/dashboard" className="flex items-center gap-2 font-pls-display font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Activity className="size-4" /></span>
          <span className="hidden sm:inline">Pulse</span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-pls-display text-lg font-semibold">{s?.company ?? "Mon cockpit"}</div>
          {snapQ.data && (
            <div className="text-xs text-muted-foreground">
              {snapQ.data.source === "demo" ? "Données de démonstration" : "Odoo"} · mis à jour {new Date(snapQ.data.at).toLocaleString("fr-FR")}
            </div>
          )}
        </div>
        {connQ.data && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => sync(), "Données Odoo synchronisées")}>
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Synchroniser</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <Link to="/pulse/connexion"><Settings className="size-4" /> <span className="hidden sm:inline">Odoo</span></Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
          <LogOut className="size-4" />
        </Button>
      </header>

      {!s ? (
        <EmptyState hasConn={!!connQ.data} busy={busy} onSync={() => run(() => sync(), "Données Odoo synchronisées")} onDemo={() => run(() => demo(), "Démo chargée")} loading={snapQ.isLoading} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div data-dim={dim} className="space-y-5">
            <HealthBar s={s} hl={hl} />
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {s.kpis.map((k) => (
                <div key={k.id} data-hl-target data-hl={hl[k.id]} className="pls-panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{k.label}</span>
                    <span className={`size-2 shrink-0 rounded-full ${toneBg[k.tone]}`} />
                  </div>
                  <div className="mt-2 font-pls-display text-xl font-semibold md:text-2xl">{fmt(k.value, k.format, s.currency)}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-muted-foreground">{k.hint}</span>
                    {k.trend && <Spark values={k.trend} />}
                  </div>
                </div>
              ))}
            </section>
            <MonthlyChart s={s} hl={hl} />
            <section className="grid gap-5 md:grid-cols-3">
              <TopList id="top-customers" title="Top clients" items={s.topCustomers} s={s} hl={hl} />
              <TopList id="top-products" title="Top produits" items={s.topProducts} s={s} hl={hl} />
              <TopList id="top-suppliers" title="Top fournisseurs" items={s.topSuppliers} s={s} hl={hl} />
            </section>
            <section className="grid gap-5 md:grid-cols-2">
              <Balance id="receivables" title="Créances clients" d={s.receivables} s={s} hl={hl} />
              <Balance id="payables" title="Dettes fournisseurs" d={s.payables} s={s} hl={hl} />
            </section>
          </div>
          <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <Assistant onHighlight={setHl} />
            <Insights s={s} setHl={setHl} />
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasConn, busy, onSync, onDemo, loading }: { hasConn: boolean; busy: boolean; onSync: () => void; onDemo: () => void; loading: boolean }) {
  if (loading) return <div className="pls-panel h-64 animate-pulse" />;
  return (
    <div className="pls-panel mx-auto mt-10 max-w-xl p-10 text-center">
      <Sparkles className="mx-auto size-8 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold">Alimentez votre cockpit</h2>
      <p className="mt-2 text-muted-foreground">Connectez votre base Odoo pour analyser vos ventes, achats et factures — ou explorez avec des données de démonstration.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasConn ? (
          <Button onClick={onSync} disabled={busy}>Importer depuis Odoo</Button>
        ) : (
          <Button asChild><Link to="/pulse/connexion">Connecter Odoo</Link></Button>
        )}
        <Button variant="secondary" onClick={onDemo} disabled={busy}>Essayer la démo</Button>
      </div>
    </div>
  );
}

function HealthBar({ s, hl }: { s: Snapshot; hl: HL }) {
  const tone: Tone = s.health >= 65 ? "positive" : s.health >= 45 ? "warning" : "critical";
  const label = tone === "positive" ? "Bonne santé" : tone === "warning" ? "À surveiller" : "Fragile";
  const C = 2 * Math.PI * 34;
  return (
    <section data-hl-target data-hl={hl["health"]} className="pls-panel flex flex-wrap items-center gap-6 p-5">
      <div className="relative size-24">
        <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
          <circle cx="40" cy="40" r="34" className="fill-none stroke-muted" strokeWidth="8" />
          <circle cx="40" cy="40" r="34" className={`fill-none ${toneText[tone]}`} stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - s.health / 100)} />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-pls-display text-2xl font-semibold">{s.health}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Score de santé économique</div>
        <div className={`font-pls-display text-2xl font-semibold ${toneText[tone]}`}>{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">Croissance, marge, encaissements, dépendance client et transformation commerciale.</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {s.modules.map((m) => (
          <span key={m} className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{m}</span>
        ))}
      </div>
    </section>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 60},${20 - (v / max) * 18}`).join(" ");
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-14 shrink-0 text-primary">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MonthlyChart({ s, hl }: { s: Snapshot; hl: HL }) {
  const max = Math.max(...s.monthly.flatMap((m) => [m.sales, m.purchases]), 1);
  return (
    <section data-hl-target data-hl={hl["chart-monthly"]} className="pls-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Ventes vs Achats — 12 mois</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Ventes</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-pls-info" />Achats</span>
        </div>
      </div>
      <div className="mt-5 flex h-48 items-end gap-1.5 md:gap-3">
        {s.monthly.map((m) => (
          <div key={m.m} className="group flex h-full flex-1 flex-col justify-end" title={`${m.m} · ventes ${fmt(m.sales, "money", s.currency)} · achats ${fmt(m.purchases, "money", s.currency)}`}>
            <div className="flex flex-1 items-end gap-0.5">
              <div className="flex-1 rounded-t bg-primary transition-all group-hover:opacity-80" style={{ height: `${(m.sales / max) * 100}%` }} />
              <div className="flex-1 rounded-t bg-pls-info/70" style={{ height: `${(m.purchases / max) * 100}%` }} />
            </div>
            <div className="mt-2 text-center text-[10px] text-muted-foreground">{new Date(m.m + "-01").toLocaleDateString("fr-FR", { month: "short" })}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopList({ id, title, items, s, hl }: { id: string; title: string; items: { name: string; value: number }[]; s: Snapshot; hl: HL }) {
  const max = items[0]?.value || 1;
  return (
    <section data-hl-target data-hl={hl[id]} className="pls-panel p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.length === 0 && <li className="text-sm text-muted-foreground">Aucune donnée</li>}
        {items.map((it) => (
          <li key={it.name}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate">{it.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmt(it.value, "money", s.currency)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Balance({ id, title, d, s, hl }: { id: string; title: string; d: { total: number; overdue: number }; s: Snapshot; hl: HL }) {
  const r = d.total ? d.overdue / d.total : 0;
  return (
    <section data-hl-target data-hl={hl[id]} className="pls-panel p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 font-pls-display text-3xl font-semibold">{fmt(d.total, "money", s.currency)}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-pls-critical" style={{ width: `${r * 100}%` }} />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">dont <span className="text-pls-critical">{fmt(d.overdue, "money", s.currency)}</span> échus ({Math.round(r * 100)} %)</div>
    </section>
  );
}

function Insights({ s, setHl }: { s: Snapshot; setHl: (h: HL) => void }) {
  return (
    <section className="pls-panel p-5">
      <h3 className="font-semibold">Signaux détectés</h3>
      <ul className="mt-3 space-y-2">
        {s.insights.map((i) => (
          <li key={i.id}>
            <button className="w-full rounded-lg border border-border p-3 text-left transition hover:bg-accent" onMouseEnter={() => setHl({ [i.target]: i.tone })} onMouseLeave={() => setHl({})} onClick={() => setHl({ [i.target]: i.tone })}>
              <div className={`text-sm font-semibold ${toneText[i.tone]}`}>{i.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{i.text}</div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Voice assistant (browser speech APIs, no extra library) ----------
type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onend: () => void; onerror: (e: { error: string }) => void };

function Assistant({ onHighlight }: { onHighlight: (h: HL) => void }) {
  const ask = useServerFn(askDashboard);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [text, setText] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const recRef = useRef<SR | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const msgs = useQuery({
    queryKey: ["messages"],
    queryFn: async () => (await pls(supabase).from("pls_chat_messages").select("id, role, content").order("created_at", { ascending: false }).limit(20)).data?.reverse() ?? [],
  });
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.data, thinking]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak(t: string, after: () => void) {
    if (!voiceOn || !("speechSynthesis" in window)) { setTimeout(after, 9000); return; }
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "fr-FR";
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("fr"));
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      setTimeout(after, 1500);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function send(q: string) {
    if (!q.trim() || thinking) return;
    setText("");
    setThinking(true);
    onHighlight({});
    try {
      const r = await ask({ data: { question: q } });
      const h: HL = {};
      r.highlights.forEach((x) => (h[x.id] = x.tone as Tone));
      onHighlight(h);
      const first = r.highlights[0]?.id;
      if (first) document.querySelector(`[data-hl]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      speak(r.answer, () => onHighlight({}));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setThinking(false);
    }
  }

  function toggleMic() {
    if (listening) return recRef.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return toast.error("La reconnaissance vocale n'est pas disponible sur ce navigateur. Utilisez Chrome, Edge ou Safari, ou tapez votre question.");
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    let final = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        t += e.results[i]?.[0]?.transcript ?? "";
        if (e.results[i]?.isFinal) final = t;
      }
      setInterim(t);
    };
    rec.onerror = (e) => e.error !== "no-speech" && toast.error(`Micro : ${e.error}`);
    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (final) send(final);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  const state = listening ? "Je vous écoute…" : thinking ? "J'analyse vos données…" : speaking ? "Je vous réponds" : "Appuyez pour parler";
  const suggestions = ["Comment va mon entreprise ?", "Où sont mes risques de trésorerie ?", "Comment accélérer ma croissance ?"];

  return (
    <section className="pls-panel flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Analyste vocal</h3>
        <button onClick={() => { setVoiceOn(!voiceOn); window.speechSynthesis?.cancel(); }} className="text-muted-foreground hover:text-foreground" aria-label="Voix">
          {voiceOn ? <Volume2 className="size-4" /> : <Square className="size-4" />}
        </button>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={toggleMic}
          aria-label="Parler au tableau de bord"
          className={`grid size-20 place-items-center rounded-full transition ${listening ? "pls-orb-active bg-pls-critical text-destructive-foreground" : speaking || thinking ? "pls-orb-active bg-primary text-primary-foreground" : "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-105"}`}
        >
          {listening ? <MicOff className="size-8" /> : <Mic className="size-8" />}
        </button>
        <div className="mt-3 text-sm text-muted-foreground">{state}</div>
        {interim && <div className="mt-1 text-center text-sm italic">« {interim} »</div>}
      </div>
      <div ref={listRef} className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {(msgs.data ?? []).length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">{q}</button>
            ))}
          </div>
        )}
        {(msgs.data ?? []).map((m) => (
          <div key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-8 bg-secondary" : "mr-4 border border-border"}`}>{m.content}</div>
        ))}
        {thinking && <div className="mr-4 animate-pulse rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">…</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ou écrivez votre question" />
        <Button size="icon" disabled={thinking || !text.trim()}><Send className="size-4" /></Button>
      </form>
    </section>
  );
}
