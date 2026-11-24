import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/pascal/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, MessagesSquare, BookOpen, Bot, Database, Plug, Sparkles, LogOut, PauseCircle, PlayCircle, Settings, Target, Wrench, Brain, BarChart3, ChevronLeft, ChevronRight, Calculator, ScrollText, Activity, Puzzle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgentConfig, toggleAgentPause } from "@/pascal/lib/agent-config.functions";
import { getProfile } from "@/pascal/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const T = "Pascal — Agent commercial senior IA";
const D = "Pascal prospecte par Gmail les contacts de vos Google Sheets, gère les objections et décroche des rendez-vous.";
export const Route = createFileRoute("/_authenticated/pascal")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AppLayout,
});

const NAV = [
  { to: "/pascal/dashboard", label: "Cockpit", icon: LayoutDashboard },
  { to: "/pascal/kpi", label: "KPI avancés", icon: BarChart3 },
  { to: "/pascal/cron-health", label: "Santé du Cron", icon: Activity },
  { to: "/pascal/simulator", label: "Simulateur", icon: Calculator },
  { to: "/pascal/prospects", label: "Prospects", icon: Users },
  { to: "/pascal/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/pascal/agent", label: "Personnalité", icon: Bot },
  { to: "/pascal/instructions", label: "Instructions", icon: ScrollText },
  { to: "/pascal/knowledge", label: "Connaissance", icon: BookOpen },
  { to: "/pascal/tools", label: "Outils", icon: Puzzle },
  { to: "/pascal/skills", label: "Skills", icon: Wrench },
  { to: "/pascal/auto-skills", label: "Auto-Skills", icon: Brain },
  { to: "/pascal/action-plans", label: "Plans d'action", icon: Target },
  { to: "/pascal/sources", label: "Sources", icon: Database },
  { to: "/pascal/connections", label: "Google", icon: Plug },
  { to: "/pascal/settings", label: "Paramètres", icon: Settings },
] as const;

function AppLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile(), enabled: !!session });
  useEffect(() => { void navigate; document.body.classList.add("pascal-theme"); return () => document.body.classList.remove("pascal-theme"); }, [navigate]);

  if (session === undefined) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Chargement…</div>;
  }
  if (!session) return null;

  const bg = (profile.data?.background_url ?? null) as string | null;
  const opacity = (profile.data?.background_opacity as number | null) ?? 0.35;

  return (
    <div className="pascal-theme min-h-screen flex relative">
      {bg && (
        <div
          aria-hidden
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url("${bg}")`, opacity }}
        />
      )}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`relative z-10 flex-1 min-w-0 p-4 md:p-6 lg:p-10 transition-[margin] duration-300 ${collapsed ? "ml-[52px]" : "ml-[52px] lg:ml-[224px]"}`}>
        <div className="max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const loc = useLocation();
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["agent-config"], queryFn: () => getAgentConfig() });
  const pauseMut = useMutation({
    mutationFn: (paused: boolean) => toggleAgentPause({ data: { paused } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-config"] }); toast.success("Statut PASCAL mis à jour."); },
  });
  const paused = cfg.data?.paused ?? false;

  async function signOut() { void supabase; window.location.href = "/"; }

  return (
    <aside className={`fixed top-0 left-0 h-screen z-40 flex flex-col border-r border-border/40 bg-sidebar backdrop-blur-xl transition-[width] duration-300 ${collapsed ? "w-[52px]" : "w-[224px]"}`}>
      <div className={`border-b border-border/40 flex items-center gap-2 ${collapsed ? "justify-center p-2" : "p-4"}`}>
        <motion.div whileHover={{ rotate: 12, scale: 1.08 }} className="size-8 rounded-lg holo-border grid place-items-center shrink-0">
          <Sparkles className="size-4 text-primary" />
        </motion.div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-mono text-xs tracking-widest holo-text font-semibold">PASCAL</div>
            <div className="text-[10px] text-muted-foreground">Cockpit v2</div>
          </div>
        )}
      </div>
      <nav className={`space-y-0.5 flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "p-1.5" : "p-2"}`}>
        {NAV.map((item, i) => {
          const Icon = item.icon;
          const active = loc.pathname.startsWith(item.to);
          return (
            <motion.div key={item.to} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Link
                to={item.to}
                data-active={active}
                className={`rail-item press flex items-center rounded-lg text-sm ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"} ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className={`border-t border-border/40 space-y-2 ${collapsed ? "p-1.5" : "p-3"}`}>
        <div className={`surface-2 flex items-center gap-2 ${collapsed ? "p-1.5 justify-center" : "p-2.5"}`}>
          <span className={`inline-block size-2 rounded-full pulse-dot ${paused ? "text-warning bg-warning" : "text-success bg-success"}`} />
          {!collapsed && <span className="text-xs font-medium flex-1">{paused ? "En pause" : "Actif"}</span>}
          {!collapsed && (
            <Button size="icon" variant="ghost" className="size-7" onClick={() => pauseMut.mutate(!paused)} disabled={pauseMut.isPending}>
              {paused ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center press">
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
        {!collapsed ? (
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start press">
            <LogOut className="size-4 mr-2" /> Laboratoire
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={signOut} className="w-full press" title="Laboratoire">
            <LogOut className="size-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}