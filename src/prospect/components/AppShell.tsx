import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Building2,
  ChevronLeft,
  Gauge,
  Home,
  Inbox,
  KanbanSquare,
  LogOut,
  Radar,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { signOut, useAuth } from "@/prospect/hooks/useAuth";

const NAV = [
  { to: "/prospect", label: "Cockpit", icon: Gauge },
  { to: "/prospect/search", label: "Recherche IA", icon: Radar },
  { to: "/prospect/companies", label: "Fiches entreprises", icon: Building2 },
  { to: "/prospect/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/prospect/inbox", label: "Conversations", icon: Inbox },
  { to: "/prospect/agent", label: "Agent OLLY", icon: Sparkles },
  { to: "/prospect/settings", label: "Paramètres", icon: Settings },
  { to: "/dashboard", label: "Laboratoire", icon: Home },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <motion.aside
        animate={{ width: collapsed ? 74 : 244 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="pe-glass sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden rounded-r-3xl border-l-0 p-3 md:flex"
      >
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="pe-bg-holo pe-animate-holo-shift grid size-9 place-items-center rounded-xl text-[13px] font-bold text-primary-foreground">
            OL
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-semibold">OLLY Cockpit</p>
              <p className="truncate text-[11px] text-muted-foreground">Prospection intelligente</p>
            </div>
          )}
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = item.to === "/prospect" ? path === "/prospect" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-secondary text-foreground pe-halo"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
                title={item.label}
              >
                <item.icon className={cn("size-[18px] shrink-0", active && "text-accent")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && (
                  <span className="pe-bg-holo absolute right-1.5 size-1.5 rounded-full pe-animate-holo-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
          >
            <ChevronLeft className={cn("size-[18px] transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Replier</span>}
          </button>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="size-[18px]" />
            {!collapsed && <span className="truncate">{user?.email ?? "Déconnexion"}</span>}
          </button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="pe-glass pe-scroll-thin sticky top-0 z-30 flex gap-1 overflow-x-auto p-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Bento({
  children,
  className,
  span,
}: {
  children: ReactNode;
  className?: string;
  span?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("pe-glass rounded-3xl p-5", span, className)}
    >
      {children}
    </motion.section>
  );
}
