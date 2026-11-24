import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  UserRound,
  Radar,
  BriefcaseBusiness,
  Building2,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/nexusjob/components/ui/button";

const NAV = [
  { to: "/nexusjob/dashboard", label: "Cockpit", icon: LayoutDashboard },
  { to: "/nexusjob/profile", label: "Profil", icon: UserRound },
  { to: "/nexusjob/search", label: "Recherche", icon: Radar },
  { to: "/nexusjob/offers", label: "Offres", icon: BriefcaseBusiness },
  { to: "/nexusjob/companies", label: "Entreprises", icon: Building2 },
  { to: "/nexusjob/settings", label: "Paramètres", icon: Settings2 },
] as const;

export function AppShell({ children, email }: { children: ReactNode; email?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("nxj-sidebar");
    if (stored) setCollapsed(stored === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("nxj-sidebar", c ? "0" : "1");
      return !c;
    });
  };

  const backToLab = () => navigate({ to: "/dashboard" });

  return (
    <div className="flex min-h-dvh w-full">
      {/* Barre latérale fine, repliable et lumineuse */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 244 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="sticky top-0 z-40 hidden h-dvh shrink-0 flex-col gap-2 border-r border-white/40 bg-nxj-glass-strong p-3 backdrop-blur-2xl md:flex"
      >
        <Link to="/nexusjob/dashboard" className="mb-2 flex items-center gap-3 rounded-2xl px-2 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl nxj-holo-gradient text-primary-foreground shadow-nxj-holo">
            <Sparkles className="size-5" />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="font-display text-lg font-bold leading-none"
              >
                Nexus<span className="text-accent">Job</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-nxj-holo-2 text-primary-foreground shadow-nxj-holo"
                    : "text-foreground/75 hover:bg-white/45 hover:text-foreground",
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="nav-glow"
                    className="pointer-events-none absolute inset-y-1 -left-3 w-1 rounded-full bg-accent shadow-nxj-holo"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-white/40 pt-2">
          {!collapsed && email && (
            <p className="truncate px-3 pb-1 text-[11px] text-muted-foreground">{email}</p>
          )}
          <button
            onClick={backToLab}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-white/45 hover:text-foreground"
          >
            <FlaskConical className="size-[18px] shrink-0" />
            {!collapsed && <span>Laboratoire</span>}
          </button>
          <button
            onClick={toggle}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-white/45"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
            {!collapsed && <span>Replier</span>}
          </button>
        </div>
      </motion.aside>

      {/* Navigation mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/50 bg-nxj-glass-strong px-2 py-2 backdrop-blur-2xl md:hidden">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-accent" : "text-foreground/60",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
