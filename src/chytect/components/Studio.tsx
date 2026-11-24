import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import {
  Check, CloudUpload, Crosshair, Download, FolderOpen, ImagePlus, Loader2, LogOut, Paperclip, Plus, Redo2, Sparkles, Trash2, Undo2, Wand2, X,
} from "lucide-react";
import { chyt as supabase } from "@/chytect/lib/db";
import { streamImage } from "@/chytect/lib/stream-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Project = { id: string; name: string; photo_path: string | null; created_at: string };
type Version = { id: string; path: string; prompt: string; url?: string | undefined };
type Point = { x: number; y: number };

async function toJpeg(src: Blob, max = 1536): Promise<Blob> {
  const img = await createImageBitmap(src);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
}

const where = (p: Point) => {
  const h = p.x < 33 ? "à gauche" : p.x > 66 ? "à droite" : "au centre";
  const v = p.y < 33 ? "en haut" : p.y > 66 ? "en bas (premier plan)" : "au milieu";
  return `${h}, ${v} de l'image (environ ${Math.round(p.x)}% depuis le bord gauche et ${Math.round(p.y)}% depuis le bord haut)`;
};

function buildPrompt(mode: "add" | "edit", text: string, point: Point | null, hasRef: boolean) {
  const keep =
    "Conserve strictement tout le reste de la photo : architecture, murs, sol, fenêtres, meubles existants, cadrage, perspective, lumière et couleurs. Le résultat doit rester une photo réaliste de la même pièce.";
  const ref = hasRef
    ? " La deuxième image est une photo de référence de l'objet : reproduis fidèlement sa forme, ses matériaux, ses couleurs et ses détails."
    : "";
  if (mode === "add") {
    return `La première image est la photo réelle d'une pièce. Ajoute dans cette pièce : ${text}.${ref} ${
      point ? `Place-le ${where(point)}.` : "Place-le à l'endroit le plus logique."
    } Intègre-le de manière photoréaliste : échelle cohérente avec la pièce, posé correctement au sol ou contre le mur, perspective, ombres et reflets en accord avec l'éclairage existant. ${keep}`;
  }
  return `La première image est la photo réelle d'une pièce. Applique cette modification : ${text}.${ref} ${
    point ? `La zone concernée se situe ${where(point)}.` : ""
  } Modifie uniquement ce qui est demandé. ${keep}`;
}

export function Studio({ session }: { session: Session }) {
  const uid = session.user.id;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [index, setIndex] = useState(-1); // -1 = original photo
  const [point, setPoint] = useState<Point | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [prompt, setPrompt] = useState("");
  const [ref, setRef] = useState<{ file: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ src: string; final: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dialog, setDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === projectId) ?? null;
  const current = index >= 0 ? versions[index] : null;
  const currentUrl = current?.url ?? originalUrl;

  const signed = async (path: string) =>
    (await supabase.storage.from("chytect-photos").createSignedUrl(path, 3600)).data?.signedUrl ?? undefined;

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from("chyt_projects").select("id,name,photo_path,created_at").order("created_at", { ascending: false });
    setProjects(data ?? []);
    return data ?? [];
  }, []);

  useEffect(() => {
    loadProjects().then((list) => {
      const saved = localStorage.getItem("chyt-project");
      setProjectId(list.find((p: Project) => p.id === saved)?.id ?? list[0]?.id ?? null);
    });
  }, [loadProjects]);

  useEffect(() => {
    setPoint(null); setPreview(null); setVersions([]); setIndex(-1); setOriginalUrl(null);
    if (!projectId) return;
    localStorage.setItem("chyt-project", projectId);
    let live = true;
    (async () => {
      const p = projects.find((x) => x.id === projectId);
      if (p?.photo_path) { const u = await signed(p.photo_path); if (live) setOriginalUrl(u ?? null); }
      const { data } = await supabase.from("chyt_renders").select("id,path,prompt").eq("project_id", projectId).order("created_at");
      const list = await Promise.all((data ?? []).map(async (v: any) => ({ ...v, url: await signed(v.path) })));
      if (live) { setVersions(list); setIndex(list.length - 1); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project?.photo_path]);

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) { toast.error("Choisissez une image (JPG, PNG…)."); return; }
    setImporting(true);
    try {
      const blob = await toJpeg(file);
      const { data: proj, error } = await supabase
        .from("chyt_projects")
        .insert({ name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Nouvelle pièce", user_id: uid })
        .select("id,name,photo_path,created_at").single();
      if (error) throw error;
      const path = `${uid}/${proj.id}/original-${Date.now()}.jpg`;
      const up = await supabase.storage.from("chytect-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await supabase.from("chyt_projects").update({ photo_path: path }).eq("id", proj.id);
      setProjects((l) => [{ ...proj, photo_path: path }, ...l]);
      setProjectId(proj.id);
      toast.success("Photo importée : vous pouvez travailler dessus.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally { setImporting(false); }
  };

  const onRefFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (ref) URL.revokeObjectURL(ref.url);
    setRef({ file, url: URL.createObjectURL(file) });
  };

  const run = async () => {
    if (!projectId || !currentUrl) { toast.error("Importez d'abord la photo d'une pièce."); return; }
    if (prompt.trim().length < 2) { toast.error("Décrivez ce que vous voulez."); return; }
    setBusy(true); setPreview(null);
    try {
      const base = await toJpeg(await (await fetch(currentUrl)).blob());
      const form = new FormData();
      form.append("prompt", buildPrompt(mode, prompt.trim(), point, Boolean(ref)));
      form.append("image[]", new File([base], "piece.jpg", { type: "image/jpeg" }));
      if (ref) form.append("image[]", new File([await toJpeg(ref.file, 1024)], "reference.jpg", { type: "image/jpeg" }));
      const { data: s } = await supabase.auth.getSession();
      let finalSrc = "";
      await streamImage("/api/chytect-edit-image", form, (src, final) => {
        setPreview({ src, final });
        if (final) finalSrc = src;
      }, undefined, { Authorization: `Bearer ${s.session?.access_token ?? ""}` });
      const png = await (await fetch(finalSrc)).blob();
      const path = `${uid}/${projectId}/render-${Date.now()}.png`;
      const up = await supabase.storage.from("chytect-photos").upload(path, png, { contentType: "image/png" });
      if (up.error) throw up.error;
      const { data: row, error } = await supabase.from("chyt_renders").insert({ project_id: projectId, user_id: uid, path, prompt: prompt.trim() }).select("id,path,prompt").single();
      if (error) throw error;
      const kept = versions.slice(0, index + 1);
      setVersions([...kept, { ...row, url: finalSrc }]);
      setIndex(kept.length);
      setPreview(null); setPrompt(""); setPoint(null);
      toast.success(mode === "add" ? "Élément ajouté à la photo !" : "Modification appliquée !");
    } catch (e) {
      setPreview(null);
      const msg = e instanceof Error ? e.message : "Erreur IA";
      toast.error(msg.includes("402") ? "Crédits IA épuisés." : msg.includes("429") ? "Trop de demandes, réessayez dans un instant." : msg);
    } finally { setBusy(false); }
  };

  const removeVersion = async () => {
    if (!current) return;
    await supabase.from("chyt_renders").delete().eq("id", current.id);
    await supabase.storage.from("chytect-photos").remove([current.path]);
    const list = versions.filter((v) => v.id !== current.id);
    setVersions(list); setIndex(Math.min(index, list.length - 1));
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Supprimer ce projet et toutes ses versions ?")) return;
    await supabase.from("chyt_projects").delete().eq("id", id);
    const list = projects.filter((p) => p.id !== id);
    setProjects(list);
    if (projectId === id) setProjectId(list[0]?.id ?? null);
  };

  const download = () => {
    if (!currentUrl) return;
    const a = document.createElement("a");
    a.href = currentUrl; a.download = `${project?.name ?? "piece"}-v${index + 1}.png`; a.target = "_blank"; a.click();
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    setPoint({ x: ((e.clientX - b.left) / b.width) * 100, y: ((e.clientY - b.top) / b.height) * 100 });
  };

  const shown = preview?.src ?? currentUrl;

  return (
    <div className="chytect-theme chytect-bg flex h-screen min-h-[640px] flex-col gap-3 overflow-hidden p-3 text-foreground">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={refFileRef} type="file" accept="image/*" hidden onChange={(e) => { onRefFile(e.target.files?.[0]); e.target.value = ""; }} />

      <header className="flex h-14 shrink-0 items-center gap-4 px-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">INTERIOR AI <span className="rounded bg-primary/20 px-1.5 text-xs text-primary">STUDIO</span></h1>
          <p className="text-[11px] text-muted-foreground">Aménagez directement sur la photo réelle de votre pièce</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="chyt-btn-ghost" onClick={() => setDialog(true)}><FolderOpen className="h-4 w-4" />Projets</button>
          <button className="chyt-btn-ai" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}Nouvelle photo
          </button>
          <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:block">{session.user.email}</span>
          <button className="chyt-icon-btn" title="Se déconnecter" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-3">
        {/* CANVAS */}
        <section className="chyt-panel flex min-h-0 flex-col p-3">
          <div className="flex items-center gap-2 pb-3">
            <h2 className="chyt-panel-title">{project?.name ?? "Aucune pièce"}</h2>
            <span className="text-[11px] text-muted-foreground">{index < 0 ? "Photo originale" : `Version ${index + 1} / ${versions.length}`}</span>
            <div className="ml-auto flex gap-2">
              <button className="chyt-icon-btn" title="Version précédente" onClick={() => setIndex((i) => i - 1)} disabled={busy || index < 0}><Undo2 className="h-4 w-4" /></button>
              <button className="chyt-icon-btn" title="Version suivante" onClick={() => setIndex((i) => i + 1)} disabled={busy || index >= versions.length - 1}><Redo2 className="h-4 w-4" /></button>
              <button className="chyt-icon-btn" title="Supprimer cette version" onClick={removeVersion} disabled={busy || !current}><Trash2 className="h-4 w-4" /></button>
              <button className="chyt-icon-btn" title="Télécharger" onClick={download} disabled={!currentUrl}><Download className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="chyt-scene-viewport relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-lg">
            {shown ? (
              <div className="relative max-h-full max-w-full">
                <img
                  src={shown}
                  alt="Pièce"
                  onClick={busy ? undefined : onCanvasClick}
                  className={`block max-h-[calc(100vh-190px)] max-w-full cursor-crosshair select-none rounded-md object-contain transition-[filter] duration-500 ${preview && !preview.final ? "blur-2xl" : "blur-0"}`}
                  draggable={false}
                />
                {point && !busy && (
                  <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                    <span className="block h-6 w-6 animate-ping rounded-full bg-primary/50" />
                    <span className="absolute inset-1.5 rounded-full border-2 border-primary-foreground bg-primary" />
                  </span>
                )}
                {busy && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="chyt-chip flex items-center gap-2 px-4 py-2 text-sm"><Sparkles className="h-4 w-4 animate-spin text-primary" />L'IA travaille sur votre photo…</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <ImagePlus className="mx-auto h-10 w-10 text-primary" />
                <p className="text-sm text-muted-foreground">Importez la photo réelle d'une pièce pour commencer</p>
                <button className="chyt-btn-ai" onClick={() => fileRef.current?.click()}>Importer une photo</button>
              </div>
            )}
            {shown && (
              <div className="absolute left-3 top-3 rounded-md bg-background/75 px-2 py-1 text-[11px] text-muted-foreground">
                {point ? "Point choisi — l'élément sera placé ici" : "Cliquez sur la photo pour choisir l'emplacement"}
              </div>
            )}
          </div>
          {(versions.length > 0 || originalUrl) && (
            <div className="flex gap-2 overflow-x-auto pt-3">
              {[{ id: "orig", url: originalUrl ?? undefined, prompt: "Photo originale" }, ...versions].map((v, i) => (
                <button key={v.id} title={v.prompt} onClick={() => !busy && setIndex(i - 1)} data-active={index === i - 1}
                  className="chyt-tool-btn shrink-0 overflow-hidden border border-border p-0 data-[active=true]:border-primary">
                  {v.url && <img src={v.url} alt={v.prompt} className="h-14 w-20 object-cover" />}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* AI PANEL */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <section className="chyt-panel flex flex-col gap-3 p-4">
            <div className="flex rounded-lg border border-border p-1 text-xs">
              {([["add", "Ajouter un élément", Plus], ["edit", "Modifier la pièce", Wand2]] as const).map(([m, l, I]) => (
                <button key={m} data-active={mode === m} onClick={() => setMode(m)} className="chyt-tool-btn flex-1 flex-row py-2"><I className="h-3.5 w-3.5" />{l}</button>
              ))}
            </div>
            <textarea className="chyt-field h-28" maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "add" ? "Ex : ajoute une table basse en verre devant le canapé" : "Ex : peins le mur du fond en vert sauge"} />

            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">Photo de l'objet (facultatif)</p>
              {ref ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={ref.url} alt="Référence" className="h-28 w-full object-contain" />
                  <button className="chyt-icon-btn absolute right-1.5 top-1.5 h-7 w-7" onClick={() => { URL.revokeObjectURL(ref.url); setRef(null); }} title="Retirer"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <button className="chyt-btn-ghost w-full" onClick={() => refFileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onRefFile(e.dataTransfer.files[0]); }}>
                  <Paperclip className="h-4 w-4" />Joindre la photo de l'objet
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              {point ? <>Emplacement choisi <button className="ml-auto underline" onClick={() => setPoint(null)}>effacer</button></> : "Aucun emplacement : l'IA choisira"}
            </div>

            <button className="chyt-btn-ai w-full justify-center py-3" onClick={run} disabled={busy || !currentUrl}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Génération en cours…" : mode === "add" ? "Ajouter sur la photo" : "Appliquer la modification"}
            </button>
          </section>

          <section className="chyt-panel space-y-2 p-4 text-xs text-muted-foreground">
            <h2 className="chyt-panel-title">Comment ça marche</h2>
            <p className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-success" />Cliquez sur la photo pour indiquer où placer l'élément.</p>
            <p className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-success" />Décrivez l'objet et joignez sa photo pour un rendu fidèle.</p>
            <p className="flex gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-success" />Chaque résultat est gardé : revenez à une version précédente à tout moment.</p>
          </section>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="chytect-theme">
          <DialogHeader><DialogTitle>Mes projets</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet pour l'instant.</p>}
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <button className="chyt-tool-btn flex-1 flex-row justify-start px-3 py-2 text-sm" data-active={p.id === projectId} onClick={() => { setProjectId(p.id); setDialog(false); }}>{p.name}</button>
                <button className="chyt-icon-btn h-8 w-8" title="Supprimer" onClick={() => deleteProject(p.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
