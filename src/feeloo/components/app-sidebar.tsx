import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Briefcase, BarChart3, Plug, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Sparkles, Timer, Brain, Menu, X, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const items = [
  { to: "/feeloo", label: "Cockpit", icon: LayoutDashboard },
  { to: "/feeloo/candidates", label: "Candidats", icon: Users },
  { to: "/feeloo/jobs", label: "Postes", icon: Briefcase },
  { to: "/feeloo/smart", label: "Smart IA", icon: Brain },
  { to: "/feeloo/automation", label: "Automatisation", icon: Timer },
  { to: "/feeloo/analytics", label: "Analytique", icon: BarChart3 },
  { to: "/feeloo/integrations", label: "Intégrations", icon: Plug },
  { to: "/feeloo/settings", label: "Paramètres", icon: Settings },
];

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { location } = useRouterState();
  return (
    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === "/feeloo" ? location.pathname.replace(/\/$/, "") === "/feeloo" : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={cn(
              "relative flex items-center rounded-xl text-sm transition group",
              collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2",
              active ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active && "text-accent")} />
            {!collapsed && <span className="truncate">{label}</span>}
            {active && <span className={cn("absolute rounded-full holo-bg", collapsed ? "left-0 top-2 bottom-2 w-0.5" : "left-0 top-2 bottom-2 w-0.5")} />}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ collapsed, setCollapsed, onNavigate, mobile }: {
  collapsed: boolean; setCollapsed?: (v: boolean) => void; onNavigate?: () => void; mobile?: boolean;
}) {
  return (
    <div className="glass-dark h-full rounded-2xl flex flex-col text-sidebar-foreground overflow-hidden">
      <div className={cn("border-b border-white/10 py-3", collapsed ? "px-2" : "px-3")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}>
          <div className="size-8 rounded-lg holo-bg grid place-items-center shrink-0"><Sparkles className="size-4 text-white" /></div>
          {!collapsed && <div className="font-display font-semibold tracking-tight truncate">Feeloo</div>}
          {!collapsed && !mobile && setCollapsed && (
            <button onClick={() => setCollapsed(true)} aria-label="Replier la barre latérale"
              className="ml-auto shrink-0 size-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        {collapsed && !mobile && setCollapsed && (
          <button onClick={() => setCollapsed(false)} aria-label="Déplier la barre latérale"
            className="mt-2 mx-auto flex size-9 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition">
            <PanelLeftOpen className="size-4" />
          </button>
        )}
      </div>

      <NavList collapsed={collapsed} onNavigate={onNavigate} />

      <Link to="/" search={{ voice: false }} title={collapsed ? "Retour à Aura" : undefined} aria-label="Retour à Aura"
        className={cn("mx-2 flex items-center rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition", collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2")}>
        <Home className="size-[18px] shrink-0" />{!collapsed && <span>Retour à Aura</span>}
      </Link>
      <button
        onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
        title={collapsed ? "Déconnexion" : undefined}
        aria-label="Déconnexion"
        className={cn(
          "m-2 flex items-center rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition",
          collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2",
        )}
      >
        <LogOut className="size-[18px] shrink-0" />{!collapsed && <span>Déconnexion</span>}
      </button>
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tc-sidebar-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  const toggle = (v: boolean) => { setCollapsed(v); localStorage.setItem("tc-sidebar-collapsed", v ? "1" : "0"); };

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="md:hidden fixed z-40 top-3 left-3 size-10 rounded-xl glass-dark text-white grid place-items-center"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 p-3">
            <div className="relative h-full">
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"
                className="absolute -right-1 top-1 z-10 size-8 grid place-items-center rounded-lg bg-white/10 text-white">
                <X className="size-4" />
              </button>
              <SidebarBody collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop */}
      <aside className={cn("hidden md:block shrink-0 transition-[width] duration-300 sticky top-0 h-screen p-3", collapsed ? "w-[76px]" : "w-60")}>
        <SidebarBody collapsed={collapsed} setCollapsed={toggle} />
      </aside>
    </>
  );
}
