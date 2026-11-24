import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "motion/react";
import { Sparkles, PenTool, CalendarClock, Library, ArrowRight, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cml/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({ ideas: 0, drafts: 0, scheduled: 0, published: 0 });
  const [name, setName] = useState<string>("");
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", u.user!.id).maybeSingle();
      setName(prof?.display_name ?? "");
      const [ideas, drafts, scheduled, published] = await Promise.all([
        supabase.from("cml_ideas").select("*", { count: "exact", head: true }),
        supabase.from("cml_posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("cml_posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("cml_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
      ]);
      setStats({
        ideas: ideas.count ?? 0,
        drafts: drafts.count ?? 0,
        scheduled: scheduled.count ?? 0,
        published: published.count ?? 0,
      });
      const { data: r } = await supabase.from("cml_posts").select("*").order("updated_at", { ascending: false }).limit(4);
      setRecent(r ?? []);
    })();
  }, []);

  const cards = [
    { to: "/cml/ideas", label: "Générer des idées", icon: Sparkles, desc: "Tendances IA en temps réel." },
    { to: "/cml/editor", label: "Rédiger un post", icon: PenTool, desc: "Rédaction algorithme-ready." },
    { to: "/cml/studio", label: "Studio image", icon: Zap, desc: "GPT-Image 2 configuré." },
    { to: "/cml/planner", label: "Planificateur", icon: CalendarClock, desc: "Organise sans limite." },
  ] as const;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Cockpit</div>
        <h1 className="mt-1 font-display text-4xl font-semibold">
          Bonjour <span className="cml-text-holo">{name || "créateur"}</span>.
        </h1>
        <p className="mt-1 text-muted-foreground">Ton expert LinkedIn est prêt. Que crée-t-on aujourd'hui ?</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Idées", value: stats.ideas },
          { label: "Brouillons", value: stats.drafts },
          { label: "Planifiés", value: stats.scheduled },
          { label: "Publiés", value: stats.published },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="cml-bento p-5"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-semibold cml-text-holo">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Link to={c.to} className="cml-bento cml-holo-halo group block p-5 transition hover:scale-[1.01]">
              <c.icon className="h-6 w-6" style={{ color: "#5DF8D8" }} />
              <div className="mt-4 font-display text-lg font-semibold">{c.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
              <ArrowRight className="mt-4 h-4 w-4 opacity-60 transition group-hover:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="cml-bento p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 cml-text-holo" style={{ color: "#5DF8D8" }} />
            <h2 className="font-display text-lg font-semibold">Derniers posts</h2>
          </div>
          <Link to="/cml/library" className="text-sm text-muted-foreground hover:text-foreground">
            Voir tout →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun post pour le moment. Commence par générer des idées.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.status}</div>
                <div className="mt-1 line-clamp-1 font-medium">{p.title ?? p.hook ?? "Sans titre"}</div>
                <div className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">{p.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
