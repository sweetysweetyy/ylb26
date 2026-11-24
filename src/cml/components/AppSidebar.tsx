import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Settings2, Sparkles, PenTool, Image as ImageIcon,
  CalendarClock, Library, Settings, LogOut, ChevronLeft, ChevronRight, Linkedin,
  Layers, MessageSquare, Radar,
} from "lucide-react";
import { motion } from "motion/react";

const nav = [
  { to: "/cml/dashboard", label: "Cockpit", icon: LayoutDashboard },
  { to: "/cml/config", label: "Configuration", icon: Settings2 },
  { to: "/cml/trends", label: "Tendances live", icon: Radar },
  { to: "/cml/ideas", label: "Idées IA", icon: Sparkles },
  { to: "/cml/editor", label: "Rédaction", icon: PenTool },
  { to: "/cml/carousels", label: "Carrousels", icon: Layers },
  { to: "/cml/studio", label: "Studio image", icon: ImageIcon },
  { to: "/cml/planner", label: "Planificateur", icon: CalendarClock },
  { to: "/cml/linkedin", label: "LinkedIn", icon: Linkedin },
  { to: "/cml/comments", label: "Commentaires IA", icon: MessageSquare },
  { to: "/cml/library", label: "Bibliothèque", icon: Library },
  { to: "/cml/settings", label: "Paramètres", icon: Settings },
] as const;


export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  function signOut() {
    navigate({ to: "/dashboard" });
  }

  return (
    <aside
      className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-white/5 bg-[var(--sidebar)] backdrop-blur-xl transition-[width] duration-300 ${
        collapsed ? "w-[68px]" : "w-[236px]"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-8 w-8 shrink-0 rounded-lg cml-bg-holo cml-holo-shine cml-ring-holo" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold">Holo CM</div>
            <div className="truncate text-[10px] text-muted-foreground">LinkedIn Cockpit</div>
          </div>
        )}
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-2">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-y-1 left-0 w-[3px] rounded-r-full cml-bg-holo"
                />
              )}
              <item.icon
                className={`h-4.5 w-4.5 shrink-0 ${active ? "cml-text-holo" : ""}`}
                style={active ? { color: "#5DF8D8" } : undefined}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-2">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Laboratoire</span>}
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-muted-foreground hover:bg-white/5"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
