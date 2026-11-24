import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { writePost, generateImage } from "@/cml/lib/ai.functions";
import { publishToLinkedIn } from "@/cml/lib/linkedin.functions";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, PenTool, Image as ImageIcon, Save, Copy, Sparkles, Linkedin, Download, Maximize2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/cml/editor")({
  validateSearch: z.object({
    ideaId: z.string().uuid().optional(),
    postId: z.string().uuid().optional(),
  }),
  component: EditorPage,
});

function EditorPage() {
  const { ideaId, postId } = Route.useSearch();
  const [idea, setIdea] = useState<any>(null);
  const [post, setPost] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [customBrief, setCustomBrief] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [writing, setWriting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [imgPrompt, setImgPrompt] = useState("");
  const [style, setStyle] = useState("photo éditoriale, minimaliste");
  const [mood, setMood] = useState("premium, holographique, teal profond");
  const [ratio, setRatio] = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [background, setBackground] = useState<"auto" | "transparent" | "opaque">("auto");
  const [imaging, setImaging] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fullImage, setFullImage] = useState(false);

  const wp = useServerFn(writePost);
  const gi = useServerFn(generateImage);
  const pub = useServerFn(publishToLinkedIn);

  useEffect(() => {
    if (ideaId) supabase.from("cml_ideas").select("*").eq("id", ideaId).maybeSingle().then(({ data }) => setIdea(data));
    if (postId) supabase.from("cml_posts").select("*").eq("id", postId).maybeSingle().then(({ data }) => setPost(data));
    supabase.auth.getUser().then(async ({ data: u }) => {
      if (!u.user) return;
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("cml_settings").select("linkedin_profile").eq("user_id", u.user.id).maybeSingle(),
      ]);
      setProfile({ ...(p ?? {}), linkedin: s?.linkedin_profile });
    });
  }, [ideaId, postId]);

  async function write() {
    setWriting(true);
    try {
      const p = await wp({ data: { ideaId, customBrief: customBrief || undefined, length } });
      setPost(p);
      toast.success("Post rédigé ✨");
    } catch (e: any) { toast.error(e.message); }
    finally { setWriting(false); }
  }

  async function saveEdits() {
    if (!post) return;
    const { error } = await supabase.from("cml_posts").update({
      content: post.content, title: post.title, hook: post.hook, hashtags: post.hashtags,
    }).eq("id", post.id);
    if (error) toast.error(error.message);
    else toast.success("Enregistré");
  }

  async function publish() {
    if (!post) return;
    setPublishing(true);
    try {
      await saveEdits();
      const r = await pub({ data: { postId: post.id } });
      setPost({ ...post, status: "published", linkedin_urn: r.linkedin_urn });
      toast.success("Publié sur LinkedIn 🚀");
    } catch (e: any) { toast.error(e.message); }
    finally { setPublishing(false); }
  }

  async function makeImage() {
    if (!post) { toast.error("Rédige d'abord le post"); return; }
    if (!imgPrompt) { toast.error("Décris l'image"); return; }
    setImaging(true);
    try {
      const r = await gi({
        data: { postId: post.id, prompt: imgPrompt, style, mood, aspectRatio: ratio, quality, background },
      });
      setPost({ ...post, image_url: r.image, image_prompt: r.prompt });
      toast.success("Image générée 🎨");
    } catch (e: any) { toast.error(e.message); }
    finally { setImaging(false); }
  }

  function copyContent() {
    if (!post) return;
    const text = `${post.content}\n\n${(post.hashtags ?? []).map((h: string) => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("Copié");
  }

  function downloadImage() {
    if (!post?.image_url) return;
    const a = document.createElement("a");
    a.href = post.image_url;
    a.download = `holo-${post.id.slice(0, 8)}.png`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Rédaction</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Studio <span className="cml-text-holo">algorithme-ready</span></h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div layout className="cml-bento p-6 relative overflow-hidden">
          <AnimatePresence>
            {writing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#1A312C]/85 backdrop-blur-md"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-24 w-24">
                    <motion.div className="absolute inset-0 rounded-full border-2 border-holo/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.8, repeat: Infinity }} />
                    <motion.div className="absolute inset-3 rounded-full border-2 border-holo/50"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0, 0.9] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }} />
                    <div className="absolute inset-6 rounded-full cml-bg-holo cml-holo-shine" />
                    <PenTool className="absolute inset-0 m-auto h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="text-center">
                    <div className="font-display text-lg">L'IA rédige…</div>
                    <motion.div className="mt-1 text-xs text-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
                      Analyse dwell-time · Hook contrarian · CTA ouvert
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">Rédaction</h2>
          </div>

          {idea && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Idée sélectionnée</div>
              <div className="mt-1 font-medium">{idea.title}</div>
              {idea.hook && <div className="mt-1 text-sm text-muted-foreground italic">« {idea.hook} »</div>}
            </div>
          )}

          <label className="mt-4 block text-xs text-muted-foreground">Brief libre (optionnel)</label>
          <textarea
            value={customBrief} onChange={(e) => setCustomBrief(e.target.value)} rows={3}
            placeholder="Ex: partager un retour d'expérience sur la prospection outbound…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />

          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Longueur</label>
            <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/5 text-xs">
              {(["short", "medium", "long"] as const).map((l) => (
                <button key={l} onClick={() => setLength(l)}
                  className={`px-4 py-1.5 ${length === l ? "cml-bg-holo text-primary-foreground" : ""}`}>
                  {l === "short" ? "Court" : l === "medium" ? "Moyen" : "Long"}
                </button>
              ))}
            </div>
          </div>

          <button onClick={write} disabled={writing}
            className="mt-4 inline-flex items-center gap-2 rounded-full cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60">
            {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {post ? "Régénérer" : "Rédiger le post"}
          </button>

          {post && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Hook</label>
                <input value={post.hook ?? ""} onChange={(e) => setPost({ ...post, hook: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Contenu</label>
                <textarea value={post.content ?? ""} onChange={(e) => setPost({ ...post, content: e.target.value })}
                  rows={14}
                  className="mt-1 w-full whitespace-pre-line rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-[Inter] leading-relaxed outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hashtags</label>
                <input
                  value={(post.hashtags ?? []).join(" ")}
                  onChange={(e) => setPost({ ...post, hashtags: e.target.value.split(/\s+/).filter(Boolean).map((h: string) => h.replace(/^#/, "")) })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 outline-none" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={publish} disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-4 py-2 text-xs font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60">
                  {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Linkedin className="h-3.5 w-3.5" />}
                  Publier sur LinkedIn
                </button>
                <button onClick={() => setPreview(true)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  <Eye className="h-3.5 w-3.5" /> Preview LinkedIn
                </button>
                <button onClick={saveEdits} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  <Save className="h-3.5 w-3.5" /> Enregistrer
                </button>
                <button onClick={copyContent} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  <Copy className="h-3.5 w-3.5" /> Copier
                </button>
                <Link to="/cml/library" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  Bibliothèque
                </Link>
              </div>
              {post.status === "published" && (
                <div className="rounded-lg border border-holo/30 cml-bg-holo/10 px-3 py-2 text-xs">
                  ✅ Publié sur LinkedIn{post.linkedin_urn ? ` — URN: ${post.linkedin_urn}` : ""}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.div layout className="cml-bento cml-holo-halo p-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">Image GPT-Image 2</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">L'image sera liée automatiquement au post.</p>

          <label className="mt-4 block text-xs text-muted-foreground">Prompt</label>
          <textarea value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} rows={3}
            placeholder="Description du visuel qui accompagne le post…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Style"><input value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none" /></Field>
            <Field label="Ambiance"><input value={mood} onChange={(e) => setMood(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none" /></Field>
            <Field label="Format">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as any)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="1024x1024">Carré 1:1</option>
                <option className="bg-[#1A312C]" value="1536x1024">Paysage 3:2</option>
                <option className="bg-[#1A312C]" value="1024x1536">Portrait 2:3</option>
              </select>
            </Field>
            <Field label="Qualité">
              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="low">Rapide</option>
                <option className="bg-[#1A312C]" value="medium">Standard</option>
                <option className="bg-[#1A312C]" value="high">Premium HD</option>
              </select>
            </Field>
            <Field label="Fond">
              <select value={background} onChange={(e) => setBackground(e.target.value as any)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none">
                <option className="bg-[#1A312C]" value="auto">Auto</option>
                <option className="bg-[#1A312C]" value="opaque">Opaque</option>
                <option className="bg-[#1A312C]" value="transparent">Transparent</option>
              </select>
            </Field>
          </div>

          <button onClick={makeImage} disabled={imaging || !post}
            className="mt-4 inline-flex items-center gap-2 rounded-full cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60">
            {imaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Générer l'image
          </button>
          {!post && <p className="mt-2 text-xs text-muted-foreground">Rédige d'abord un post pour lui associer une image.</p>}

          {post?.image_url && (
            <div className="mt-4 space-y-2">
              <div className="relative overflow-hidden rounded-xl border border-white/10 group">
                <img src={post.image_url} alt="visuel post" className="w-full" />
                <button onClick={() => setFullImage(true)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-2 opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadImage} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  <Download className="h-3.5 w-3.5" /> Télécharger PNG HD
                </button>
                <button onClick={() => setFullImage(true)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
                  <Maximize2 className="h-3.5 w-3.5" /> Plein écran
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* LinkedIn Preview modal */}
      <AnimatePresence>
        {preview && post && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreview(false)}>
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" /> Aperçu LinkedIn
                </div>
                <button onClick={() => setPreview(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {profile?.linkedin?.picture ? (
                    <img src={profile.linkedin.picture} className="h-12 w-12 rounded-full" alt="" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-neutral-200" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">{profile?.linkedin?.name ?? profile?.display_name ?? "Toi"}</div>
                    <div className="text-[11px] text-neutral-500">À l'instant · 🌐</div>
                  </div>
                </div>
                <div className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {post.content}
                  {post.hashtags?.length ? "\n\n" + post.hashtags.map((h: string) => `#${h}`).join(" ") : ""}
                </div>
                {post.image_url && (
                  <div className="mt-3 overflow-hidden rounded-md">
                    <img src={post.image_url} alt="" className="w-full" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-6 border-t border-neutral-200 pt-2 text-xs text-neutral-500">
                  <span>👍 J'aime</span><span>💬 Commenter</span><span>↗️ Partager</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen image */}
      <AnimatePresence>
        {fullImage && post?.image_url && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFullImage(false)}>
            <img src={post.image_url} alt="" className="max-h-full max-w-full rounded-lg" />
            <button onClick={() => setFullImage(false)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
