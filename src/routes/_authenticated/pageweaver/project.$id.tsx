import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowDown, ArrowUp, Eye, FileCode2, Layers, Loader2, Minus, Plus, ScanSearch, Sparkles, PanelLeft, LayoutTemplate,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pw } from "@/pageweaver/lib/db";
import { analyzeBrief, generateSection, regenerateSection, type Design, type SuggestedSection } from "@/pageweaver/lib/ai.functions";
import { buildDocument } from "@/pageweaver/lib/doc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Board, type View } from "@/pageweaver/components/Board";
import { SectionCard, type Tool } from "@/pageweaver/components/SectionCard";
import { Inspector } from "@/pageweaver/components/Inspector";
import { PageDialog } from "@/pageweaver/components/PageDialog";
import { CARD_W, VIRTUAL_W, type Project, type Section } from "@/pageweaver/components/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pageweaver/project/$id")({
  head: () => ({
    meta: [
      { title: "Atelier — Maquettiste" },
      { name: "description", content: "Tableau de conception des sections de votre page." },
      { property: "og:title", content: "Atelier — Maquettiste" },
      { property: "og:description", content: "Tableau de conception des sections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Studio,
});

type Tab = "brief" | "sections" | "page";

function Studio() {
  const { id } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("none");
  const [view, setView] = useState<View>({ x: 40, y: 90, k: 0.6 });
  const [tab, setTab] = useState<Tab>("brief");
  const [leftOpen, setLeftOpen] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedSection[]>([]);
  const [pageOpen, setPageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const heights = useRef<Record<string, number>>({});
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Set<string>>(new Set());

  // ---------- load + realtime ----------
  useEffect(() => {
    const desktop = window.innerWidth >= 1024;
    setLeftOpen(desktop);
    setView({ x: desktop ? 380 : 16, y: 80, k: desktop ? 0.6 : 0.45 });
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        pw(supabase).from("pw_projects").select("*").eq("id", id).single(),
        pw(supabase).from("pw_sections").select("*").eq("project_id", id).order("created_at"),
      ]);
      if (p) {
        setProject(p as unknown as Project);
        if (!(p as any).brief) setTab("brief");
        else setTab("sections");
      }
      setSections((s ?? []) as unknown as Section[]);
    })();
    const ch = supabase
      .channel(`pw-sections-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pw_sections", filter: `project_id=eq.${id}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          setSections((list) => list.filter((x) => x.id !== (payload.old as any).id));
          return;
        }
        const row = payload.new as unknown as Section;
        if (pending.current.has(row.id)) return;
        setSections((list) => (list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  // ---------- persistence ----------
  const persistSection = useCallback((sid: string, patch: Partial<Section>, delay = 600) => {
    pending.current.add(sid);
    setSaving(true);
    const acc = ((persistSection as any)._acc ??= {} as Record<string, Partial<Section>>);
    acc[sid] = { ...(acc[sid] ?? {}), ...patch };
    clearTimeout(timers.current[sid]);
    timers.current[sid] = setTimeout(async () => {
      const body = acc[sid];
      delete acc[sid];
      await pw(supabase).from("pw_sections").update(body as any).eq("id", sid);
      pending.current.delete(sid);
      setSaving(Object.keys(acc).length > 0);
    }, delay);
  }, []);

  const updateSection = useCallback((sid: string, patch: Partial<Section>, delay?: number) => {
    setSections((list) => list.map((x) => (x.id === sid ? { ...x, ...patch } : x)));
    persistSection(sid, patch, delay);
  }, [persistSection]);

  async function updateProject(patch: Partial<Project>) {
    setProject((p) => (p ? { ...p, ...patch } : p));
    await pw(supabase).from("pw_projects").update(patch as any).eq("id", id);
  }

  // ---------- sections ----------
  function nextY() {
    return sections.reduce((m, s) => Math.max(m, s.y + (heights.current[s.id] ?? 720) * (CARD_W / VIRTUAL_W) + 60), 0);
  }
  async function addSections(items: SuggestedSection[]) {
    let y = nextY();
    const rows = items.map((it) => {
      const r = { project_id: id, title: it.title, description: it.description, x: 0, y, config: { animation: "fade-up", stagger: true, hover: true } };
      y += 420;
      return r;
    });
    const { data, error } = await pw(supabase).from("pw_sections").insert(rows as any).select("*");
    if (error) return toast.error("Impossible d'ajouter la section.");
    const created = (data ?? []) as unknown as Section[];
    setSections((list) => [...list, ...created.filter((c) => !list.some((x) => x.id === c.id))]);
    if (created[0]) focus(created[0]);
    return created;
  }
  async function removeSection(sid: string) {
    if (!confirm("Supprimer cette section ?")) return;
    setSelected(null);
    setSections((l) => l.filter((x) => x.id !== sid));
    await pw(supabase).from("pw_sections").delete().eq("id", sid);
  }
  function focus(s: Section) {
    setSelected(s.id);
    const w = window.innerWidth;
    setView((v) => ({ ...v, x: w / 2 - (s.x + CARD_W / 2) * v.k, y: 90 - s.y * v.k }));
  }

  // ---------- AI ----------
  async function runAnalyze() {
    if (!project?.brief.trim()) return;
    setAnalyzing(true);
    try {
      const res = await analyzeBrief({ data: { brief: project.brief } });
      await updateProject({ design: res.design, ...(res.name && project.name === "Nouveau projet" ? { name: res.name } : {}) });
      setSuggestions(res.sections);
      toast.success("Direction artistique définie. Ajoutez les sections proposées.");
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'analyse.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runGenerate(s: Section) {
    setBusy((b) => ({ ...b, [s.id]: true }));
    updateSection(s.id, { status: "generating" }, 0);
    try {
      const { html } = await generateSection({
        data: {
          brief: project?.brief ?? "",
          design: project?.design ?? {},
          title: s.title,
          description: s.description,
          config: { ...s.config, history: undefined },
          neighbors: sections.filter((x) => x.id !== s.id).map((x) => x.title),
        },
      });
      const history = s.html ? [s.html, ...(s.config.history ?? [])].slice(0, 5) : s.config.history ?? [];
      updateSection(s.id, { html, status: "ready", config: { ...s.config, history } }, 0);
    } catch (e: any) {
      updateSection(s.id, { status: s.html ? "ready" : "draft" }, 0);
      toast.error(e.message ?? "Échec de la génération.");
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }));
    }
  }

  function targetAt(sid: string, x: number, y: number) {
    try {
      const doc = frames.current[sid]?.contentDocument;
      if (!doc) return "inconnu";
      const h = doc.documentElement.scrollHeight;
      const el = doc.elementFromPoint(x * VIRTUAL_W, y * h) as HTMLElement | null;
      if (!el) return "inconnu";
      const text = (el.innerText || el.getAttribute("alt") || "").replace(/\s+/g, " ").trim().slice(0, 120);
      return `<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 140)}"> ${text ? `« ${text} »` : ""}`;
    } catch {
      return "inconnu";
    }
  }

  async function runRegenerate(s: Section) {
    if (!s.html) return;
    const pos = (x: number, y: number) => `${Math.round(x * 100)}% horizontal / ${Math.round(y * 100)}% vertical`;
    const annotations = [
      ...s.annotations.markers.map((m) => ({ kind: "marqueur", note: m.note, position: pos(m.x, m.y), target: targetAt(s.id, m.x, m.y) })),
      ...s.annotations.strokes.map((st) => {
        const xs = st.points.map((p) => p[0]);
        const ys = st.points.map((p) => p[1]);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        return { kind: "zone dessinée", note: st.note, position: `de ${pos(x0, y0)} à ${pos(x1, y1)}`, target: targetAt(s.id, (x0 + x1) / 2, (y0 + y1) / 2) };
      }),
    ];
    setBusy((b) => ({ ...b, [s.id]: true }));
    updateSection(s.id, { status: "generating" }, 0);
    try {
      const { html } = await regenerateSection({
        data: { design: project?.design ?? {}, title: s.title, html: s.html, request: s.config.request ?? "", annotations },
      });
      const history = [s.html, ...(s.config.history ?? [])].slice(0, 5);
      updateSection(s.id, { html, status: "ready", annotations: { markers: [], strokes: [] }, config: { ...s.config, history, request: "" } }, 0);
      setTool("none");
      toast.success("Section régénérée avec vos indications.");
    } catch (e: any) {
      updateSection(s.id, { status: "ready" }, 0);
      toast.error(e.message ?? "Échec de la régénération.");
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }));
    }
  }

  function undo(s: Section) {
    const [prev, ...rest] = s.config.history ?? [];
    if (!prev) return;
    updateSection(s.id, { html: prev, config: { ...s.config, history: rest } }, 0);
  }

  // ---------- page ----------
  const pageSections = sections.filter((s) => s.in_page).sort((a, b) => a.page_order - b.page_order);
  function togglePage(s: Section) {
    if (s.in_page) {
      updateSection(s.id, { in_page: false }, 0);
      pageSections.filter((x) => x.id !== s.id).forEach((x, i) => x.page_order !== i && updateSection(x.id, { page_order: i }, 0));
    } else updateSection(s.id, { in_page: true, page_order: pageSections.length }, 0);
  }
  function moveInPage(idx: number, dir: -1 | 1) {
    const list = [...pageSections];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j]!, list[idx]!];
    list.forEach((x, i) => x.page_order !== i && updateSection(x.id, { page_order: i }, 0));
  }
  async function buildPage() {
    const ready = pageSections.filter((s) => s.html);
    if (!ready.length) { toast.error("Sélectionnez au moins une section générée."); return; }
    const body = ready.map((s) => `<!-- ${s.title.replace(/--/g, "")} -->\n${s.html}`).join("\n\n");
    const html = buildDocument(body, project?.design, { title: project?.name ?? "Page" });
    await updateProject({ page_html: html });
    setPageOpen(true);
  }

  if (!project) return <div className="pw-board-grid grid h-screen place-items-center text-sm text-muted-foreground">Chargement du projet…</div>;
  const sel = sections.find((s) => s.id === selected) ?? null;
  const design = project.design as Design;

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <Board view={view} setView={setView} onBackgroundClick={() => { setSelected(null); setTool("none"); }}>
        {sections.map((s) => (
          <SectionCard
            key={s.id}
            section={s}
            design={design}
            selected={s.id === selected}
            k={view.k}
            tool={s.id === selected ? tool : "none"}
            onTool={setTool}
            onSelect={() => { if (selected !== s.id) { setSelected(s.id); setTool("none"); } }}
            onMove={(dx, dy) => setSections((l) => l.map((x) => (x.id === s.id ? { ...x, x: x.x + dx, y: x.y + dy } : x)))}
            onMoveEnd={() => {
              const cur = sectionsRef(s.id);
              if (cur) persistSection(s.id, { x: cur.x, y: cur.y }, 0);
            }}
            onAnnotations={(a) => updateSection(s.id, { annotations: a })}
            frameRef={(el) => { frames.current[s.id] = el; }}
          />
        ))}
      </Board>

      {/* Top bar */}
      <header className="pw-panel absolute left-3 right-3 top-3 z-20 flex items-center gap-2 px-2 py-1.5">
        <Button asChild size="icon" variant="ghost"><Link to="/pageweaver/dashboard" aria-label="Projets"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <Button size="icon" variant="ghost" onClick={() => setLeftOpen((o) => !o)} aria-label="Panneau"><PanelLeft className="h-4 w-4" /></Button>
        <input
          className="min-w-0 flex-1 bg-transparent font-pw-display text-sm font-bold outline-none sm:flex-none sm:w-56"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          onBlur={(e) => updateProject({ name: e.target.value })}
        />
        <span className="hidden text-xs text-muted-foreground sm:inline">{saving ? "Enregistrement…" : "Enregistré"}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <Button size="icon" variant="ghost" onClick={() => setView((v) => ({ ...v, k: Math.max(0.15, v.k / 1.2) }))} aria-label="Dézoomer"><Minus className="h-4 w-4" /></Button>
            <span className="w-10 text-center font-mono text-xs">{Math.round(view.k * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => setView((v) => ({ ...v, k: Math.min(2, v.k * 1.2) }))} aria-label="Zoomer"><Plus className="h-4 w-4" /></Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setTab("page"); setLeftOpen(true); }}>
            <LayoutTemplate className="h-4 w-4" /> <span className="hidden sm:inline">Page</span>
            {pageSections.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-accent-foreground">{pageSections.length}</span>}
          </Button>
        </div>
      </header>

      {/* Left panel: workflow */}
      {leftOpen && (
        <aside className="pw-panel absolute bottom-3 left-3 top-[4.25rem] z-10 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden sm:w-80">
          <nav className="grid grid-cols-3 border-b text-xs">
            {([["brief", "1. Brief", ScanSearch], ["sections", "2. Sections", Layers], ["page", "3. Page", LayoutTemplate]] as const).map(([t, l, I]) => (
              <button key={t} onClick={() => setTab(t)} className={cn("flex items-center justify-center gap-1.5 py-2.5", tab === t ? "border-b-2 border-accent font-semibold" : "text-muted-foreground")}>
                <I className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "brief" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Décrivez votre page</h2>
                  <p className="text-xs text-muted-foreground">Activité, cible, ambiance, objectifs. L'IA en déduit une direction artistique et les sections idéales.</p>
                </div>
                <Textarea
                  rows={7}
                  placeholder="Ex : page d'accueil pour un studio de yoga à Saint-Denis, ambiance douce et naturelle, objectif : réservations de cours d'essai…"
                  value={project.brief}
                  onChange={(e) => setProject({ ...project, brief: e.target.value })}
                  onBlur={(e) => updateProject({ brief: e.target.value })}
                />
                <Button className="w-full" disabled={analyzing || project.brief.trim().length < 3} onClick={async () => { await updateProject({ brief: project.brief }); runAnalyze(); }}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyser la demande
                </Button>
                {design?.palette && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold">Direction artistique</p>
                    <div className="mt-2 flex gap-1">
                      {Object.entries(design.palette).map(([k, c]) => <span key={k} title={k} className="h-6 flex-1 rounded border" style={{ background: c }} />)}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{design.fonts?.heading} / {design.fonts?.body} — {design.style}</p>
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Sections proposées</p>
                      <Button size="sm" variant="outline" onClick={async () => { await addSections(suggestions); setSuggestions([]); setTab("sections"); }}>Tout ajouter</Button>
                    </div>
                    {suggestions.map((s, i) => (
                      <div key={i} className="rounded-lg border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{s.title}</p>
                          <button className="text-xs text-accent" onClick={async () => { await addSections([s]); setSuggestions((l) => l.filter((_, j) => j !== i)); }}>Ajouter</button>
                        </div>
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "sections" && (
              <div className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => addSections([{ title: "Nouvelle section", description: "" }])}>
                  <Plus className="h-4 w-4" /> Nouvelle section
                </Button>
                {sections.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Aucune section. Commencez par le brief ou créez-en une.</p>}
                {sections.map((s) => (
                  <button key={s.id} onClick={() => focus(s)} className={cn("flex w-full items-center gap-2 rounded-lg border p-2.5 text-left", s.id === selected && "border-accent bg-accent/5")}>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", s.status === "generating" ? "animate-pulse bg-accent" : s.html ? "bg-pw-success" : "bg-muted-foreground/40")} />
                    <span className="flex-1 truncate text-sm">{s.title}</span>
                    {s.in_page && <span className="text-[10px] text-pw-success">page</span>}
                  </button>
                ))}
              </div>
            )}

            {tab === "page" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Page d'accueil</h2>
                  <p className="text-xs text-muted-foreground">Cochez les sections à inclure puis ordonnez-les.</p>
                </div>
                <div className="space-y-1.5">
                  {sections.filter((s) => !s.in_page).map((s) => (
                    <label key={s.id} className={cn("flex items-center gap-2 rounded-lg border p-2 text-sm", !s.html && "opacity-50")}>
                      <input type="checkbox" checked={false} disabled={!s.html} onChange={() => togglePage(s)} className="accent-accent" />
                      <span className="flex-1 truncate">{s.title}</span>
                      {!s.html && <span className="text-[10px] text-muted-foreground">non générée</span>}
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ordre de la page</p>
                  {pageSections.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Aucune section sélectionnée.</p>}
                  {pageSections.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-pw-success/40 bg-pw-success/5 p-2 text-sm">
                      <input type="checkbox" checked onChange={() => togglePage(s)} className="accent-accent" />
                      <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 truncate">{s.title}</span>
                      <button disabled={i === 0} onClick={() => moveInPage(i, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Monter"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button disabled={i === pageSections.length - 1} onClick={() => moveInPage(i, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-30" aria-label="Descendre"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
                <Button className="w-full" disabled={!pageSections.length} onClick={buildPage}>
                  <Eye className="h-4 w-4" /> Construire et prévisualiser la page
                </Button>
                {project.page_html && (
                  <Button className="w-full" variant="outline" onClick={() => setPageOpen(true)}>
                    <FileCode2 className="h-4 w-4" /> Dernière version : aperçu & code
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right panel: inspector */}
      {sel && (
        <aside className="pw-panel absolute bottom-3 right-3 top-[4.25rem] z-30 w-[calc(100%-1.5rem)] overflow-hidden sm:w-80">
          <Inspector
            section={sel}
            busy={!!busy[sel.id] || sel.status === "generating"}
            onChange={(patch) => updateSection(sel.id, patch)}
            onGenerate={() => runGenerate(sel)}
            onRegenerate={() => runRegenerate(sel)}
            onUndo={() => undo(sel)}
            onDelete={() => removeSection(sel.id)}
            onClose={() => { setSelected(null); setTool("none"); }}
          />
        </aside>
      )}

      {pageOpen && project.page_html && <PageDialog html={project.page_html} name={project.name} onClose={() => setPageOpen(false)} />}
    </div>
  );

  function sectionsRef(sid: string) {
    let found: Section | undefined;
    setSections((l) => { found = l.find((x) => x.id === sid); return l; });
    return found;
  }
}
