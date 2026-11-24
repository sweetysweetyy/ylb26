import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateImage } from "@/cml/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cml/studio")({
  component: StudioPage,
});

function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photo éditoriale");
  const [mood, setMood] = useState("premium, holographique");
  const [ratio, setRatio] = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [background, setBackground] = useState<"auto" | "transparent" | "opaque">("auto");
  const [model, setModel] = useState("openai/gpt-image-2.5-sunburst");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [linkPostId, setLinkPostId] = useState<string>("");
  const gi = useServerFn(generateImage);

  useEffect(() => {
    supabase.from("cml_posts").select("id, title, hook, image_url").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setPosts(data ?? []));
  }, []);

  async function run() {
    if (!prompt.trim()) { toast.error("Décris l'image"); return; }
    setBusy(true);
    try {
      const r = await gi({
        data: {
          postId: linkPostId || undefined,
          prompt, style, mood, aspectRatio: ratio, quality, background, model,
        } as any,
      });
      setImage(r.image);
      toast.success("Image générée");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Studio image</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Générateur <span className="cml-text-holo">GPT-Image 2</span></h1>
        <p className="mt-1 text-muted-foreground">Configuration complète pour piloter chaque paramètre.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="cml-bento p-6 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="text-xs text-muted-foreground">Style</label>
              <input value={style} onChange={(e) => setStyle(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Ambiance</label>
              <input value={mood} onChange={(e) => setMood(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none" /></div>
            <div><label className="text-xs text-muted-foreground">Format</label>
              <select value={ratio} onChange={(e) => setRatio(e.target.value as any)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="1024x1024">Carré 1:1</option>
                <option className="bg-[#1A312C]" value="1536x1024">Paysage</option>
                <option className="bg-[#1A312C]" value="1024x1536">Portrait</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground">Qualité</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="low">Rapide</option>
                <option className="bg-[#1A312C]" value="medium">Standard</option>
                <option className="bg-[#1A312C]" value="high">Premium</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground">Modèle</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="openai/gpt-image-2.5-sunburst">GPT-Image 2.5 Sunburst</option>
                <option className="bg-[#1A312C]" value="openai/gpt-image-2">GPT-Image 2</option>
                <option className="bg-[#1A312C]" value="openai/gpt-image-1-mini">GPT-Image 1 Mini</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground">Fond</label>
              <select value={background} onChange={(e) => setBackground(e.target.value as any)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="auto">Auto</option>
                <option className="bg-[#1A312C]" value="opaque">Opaque</option>
                <option className="bg-[#1A312C]" value="transparent">Transparent</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground">Attacher à un post</label>
              <select value={linkPostId} onChange={(e) => setLinkPostId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="">— Aucun —</option>
                {posts.map((p) => <option key={p.id} value={p.id} className="bg-[#1A312C]">{(p.title ?? p.hook ?? "post").slice(0, 40)}</option>)}
              </select></div>
          </div>
          <button onClick={run} disabled={busy}
            className="mt-2 inline-flex items-center gap-2 rounded-full cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Générer
          </button>
        </div>

        <div className="cml-bento cml-holo-halo p-6">
          {image ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-white/10">
                <img src={image} alt="généré" className="w-full" />
              </div>
              <a href={image} download="holo-cm.png" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                <Download className="h-3.5 w-3.5" /> Télécharger
              </a>
            </div>
          ) : (
            <div className="grid h-full min-h-[300px] place-items-center text-sm text-muted-foreground">
              L'image apparaîtra ici.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
