import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, CalendarClock, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/_authenticated/cml/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#5DF8D8", start_date: "", end_date: "" });

  async function load() {
    const [p1, p2] = await Promise.all([
      supabase.from("cml_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("cml_posts").select("*").order("scheduled_at", { ascending: true, nullsFirst: false }),
    ]);
    setPlans(p1.data ?? []);
    setPosts(p2.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function createPlan() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cml_plans").insert({
      user_id: u.user!.id, name: form.name, description: form.description, color: form.color,
      start_date: form.start_date || null, end_date: form.end_date || null,
    });
    if (error) { toast.error(error.message); return; }
    setShowNew(false);
    setForm({ name: "", description: "", color: "#5DF8D8", start_date: "", end_date: "" });
    await load();
    toast.success("Plan créé");
  }

  async function delPlan(id: string) {
    await supabase.from("cml_plans").delete().eq("id", id);
    await supabase.from("cml_posts").update({ plan_id: null }).eq("plan_id", id);
    load();
  }
  async function attach(postId: string, planId: string | null) {
    await supabase.from("cml_posts").update({ plan_id: planId }).eq("id", postId);
    load();
  }
  async function schedule(postId: string, date: string) {
    await supabase.from("cml_posts").update({ scheduled_at: date || null, status: date ? "scheduled" : "draft" }).eq("id", postId);
    load();
  }

  const unassigned = posts.filter((p) => !p.plan_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Planificateur</div>
          <h1 className="mt-1 font-display text-4xl font-semibold">Tes plans <span className="cml-text-holo">de contenu</span></h1>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-full cml-bg-holo px-5 py-2.5 text-sm font-semibold text-primary-foreground cml-ring-holo">
          <Plus className="h-4 w-4" /> Nouveau plan
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((pl) => {
          const items = posts.filter((p) => p.plan_id === pl.id);
          return (
            <motion.div key={pl.id} layout className="cml-bento p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: pl.color }} />
                    <h3 className="font-display text-lg font-semibold">{pl.name}</h3>
                  </div>
                  {pl.description && <p className="mt-1 text-xs text-muted-foreground">{pl.description}</p>}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {pl.start_date ?? "—"} → {pl.end_date ?? "—"}
                  </div>
                </div>
                <button onClick={() => delPlan(pl.id)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {items.length === 0 && <div className="text-xs text-muted-foreground">Aucun post attaché.</div>}
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/5 bg-white/5 p-3">
                    <div className="line-clamp-1 text-sm font-medium">{p.title ?? p.hook ?? "Sans titre"}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="datetime-local" value={p.scheduled_at?.slice(0, 16) ?? ""}
                        onChange={(e) => schedule(p.id, e.target.value ? new Date(e.target.value).toISOString() : "")}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none" />
                      <span className="rounded-full bg-white/10 px-2 text-[10px]">{p.status}</span>
                      <button onClick={() => attach(p.id, null)} className="text-[10px] text-muted-foreground hover:text-foreground">retirer</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <select onChange={(e) => e.target.value && attach(e.target.value, pl.id)} value=""
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none">
                  <option className="bg-[#1A312C]" value="">+ Attacher un post</option>
                  {unassigned.map((p) => (
                    <option className="bg-[#1A312C]" key={p.id} value={p.id}>{(p.title ?? p.hook ?? "sans titre").slice(0, 40)}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          );
        })}

        {plans.length === 0 && (
          <div className="cml-bento col-span-full p-10 text-center text-muted-foreground">
            Aucun plan. Crée ton premier plan éditorial pour organiser tes posts.
          </div>
        )}
      </div>

      <div className="cml-bento p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" style={{ color: "#5DF8D8" }} />
          <h2 className="font-display text-lg font-semibold">Posts non planifiés</h2>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {unassigned.map((p) => (
            <div key={p.id} className="rounded-lg border border-white/5 bg-white/5 p-3">
              <div className="line-clamp-1 text-sm">{p.title ?? p.hook ?? "sans titre"}</div>
              <Link to="/cml/editor" search={{ postId: p.id } as any} className="text-xs cml-text-holo">éditer →</Link>
            </div>
          ))}
          {unassigned.length === 0 && <div className="text-xs text-muted-foreground">Tout est planifié 👌</div>}
        </div>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="cml-bento cml-holo-halo w-full max-w-md p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Nouveau plan</h3>
                <button onClick={() => setShowNew(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <input placeholder="Nom (ex: Lancement produit Q1)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none" />
                </div>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5" />
                <button onClick={createPlan}
                  className="w-full rounded-full cml-bg-holo px-4 py-2 text-sm font-semibold text-primary-foreground cml-ring-holo">
                  Créer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
