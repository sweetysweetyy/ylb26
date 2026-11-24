import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateIdeas } from "@/cml/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Wand2, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cml/ideas")({
  component: IdeasPage,
});

function IdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState("");
  const [count, setCount] = useState(6);
  const gen = useServerFn(generateIdeas);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from("cml_ideas").select("*").order("created_at", { ascending: false });
    setIdeas(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function run() {
    setLoading(true);
    try {
      await gen({ data: { count, focus: focus || undefined } });
      toast.success("Idées générées 🎯");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setLoading(false); }
  }

  async function del(id: string) {
    await supabase.from("cml_ideas").delete().eq("id", id);
    setIdeas((v) => v.filter((i) => i.id !== id));
  }

  async function useIdea(id: string) {
    navigate({ to: "/cml/editor", search: { ideaId: id } as any });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Radar IA</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">Idées <span className="cml-text-holo">tendances</span></h1>
        <p className="mt-1 text-muted-foreground">L'IA scanne ton domaine et propose des angles à fort reach.</p>
      </div>

      <div className="cml-bento cml-holo-halo p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Angle spécifique (optionnel) — ex: 'sujets IA + vente B2B'"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/30"
          />
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none">
            {[3, 6, 9, 12].map((n) => <option key={n} value={n} className="bg-[#1A312C]">{n} idées</option>)}
          </select>
          <button
            onClick={run} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl cml-bg-holo px-6 py-3 text-sm font-semibold text-primary-foreground cml-ring-holo disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {ideas.map((i) => (
            <motion.div
              key={i.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="cml-bento p-5"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {i.angle ?? "post"}
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <span className="cml-text-holo font-semibold">{i.trend_score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{i.title}</h3>
              {i.hook && <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm italic">« {i.hook} »</div>}
              {i.rationale && <p className="mt-3 text-xs text-muted-foreground">{i.rationale}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {(i.tags ?? []).map((t: string) => (
                  <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">#{t}</span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => useIdea(i.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full cml-bg-holo px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Rédiger
                </button>
                <button onClick={() => del(i.id)} className="rounded-full border border-white/10 p-2 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {i.used && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 text-[10px]"><Check className="h-3 w-3" /> utilisée</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {ideas.length === 0 && (
          <div className="cml-bento col-span-full p-10 text-center text-muted-foreground">
            Aucune idée pour l'instant. Lance le radar IA ci-dessus.
          </div>
        )}
      </div>
    </div>
  );
}
