import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/financierplan/hooks/useAuth";
import { initials } from "@/financierplan/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/financierplan/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/financierplan/dashboard", label: "Cockpit", icon: LayoutDashboard },
  { to: "/financierplan/nouveau", label: "Nouveau projet", icon: PlusCircle },
  { to: "/financierplan/parametres", label: "Paramètres", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const stored = localStorage.getItem("previsio.sidebar");
    if (stored) setCollapsed(stored === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("previsio.sidebar", c ? "0" : "1");
      return !c;
    });
  };

  return (
    <div className="grid-aurora min-h-screen">
      <TooltipProvider delayDuration={80}>
        <motion.aside
          animate={{ width: collapsed ? 76 : 248 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="no-print fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-border/50 bg-sidebar/70 backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60 holo-gradient blur-3xl" />
          <div className="relative flex h-16 items-center gap-3 px-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl holo-gradient shadow-[var(--shadow-holo)]">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold">Previsio</p>
                <p className="truncate text-[11px] text-muted-foreground">Financial Intelligence</p>
              </div>
            )}
          </div>

          <nav className="relative mt-4 flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const link = (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--shadow-bento)]"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-glow"
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full holo-gradient"
                    />
                  )}
                  <item.icon className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>

          <div className="relative border-t border-border/50 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground">
                {initials(user?.user_metadata?.["full_name"] as string, user?.email)}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{user?.email}</p>
                </div>
              )}
            </div>
            <div className={cn("mt-3 flex gap-2", collapsed && "flex-col")}>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Replier le menu">
                {collapsed ? (
                  <ChevronsRight className="size-4" />
                ) : (
                  <ChevronsLeft className="size-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </motion.aside>

        <main
          className={cn(
            "transition-[padding] duration-300",
            collapsed ? "pl-[76px]" : "pl-[248px]",
          )}
        >
          {children}
        </main>
      </TooltipProvider>
    </div>
  );
}
