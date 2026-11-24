import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BookOpenCheck,
  ChevronLeft,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/etudedemarche/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/etudedemarche", label: "Cockpit", icon: LayoutDashboard },
  { to: "/etudedemarche/studies/new", label: "Nouvelle étude", icon: Sparkles },
  { to: "/etudedemarche/studies", label: "Mes études", icon: FileBarChart },
  { to: "/etudedemarche/methodologies", label: "Méthodologies", icon: BookOpenCheck },
  { to: "/etudedemarche/settings", label: "Paramètres", icon: Settings },
] as const;

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.aside
      animate={{ width: open ? 232 : 76 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="glass sticky top-0 z-30 hidden h-screen shrink-0 flex-col justify-between rounded-none border-y-0 border-l-0 px-3 py-5 md:flex"
    >
      <div>
        <Link to="/etudedemarche" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl [background:var(--gradient-holo)] text-[oklch(0.22_0.06_275)] shadow-[var(--shadow-halo)]">
            <Sparkles className="h-4 w-4" />
          </span>
          {open && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-sm font-semibold tracking-tight"
            >
              Étude de marché
            </motion.span>
          )}
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.to === "/etudedemarche/studies"
                ? pathname === "/etudedemarche/studies"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all",
                  active
                    ? "bg-white/10 text-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0/12%)]"
                    : "hover:bg-white/5 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full [background:var(--gradient-holo)] shadow-[0_0_12px_2px_var(--holo-1)]" />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        {open && (
          <p className="truncate px-3 text-xs text-muted-foreground">{user?.email}</p>
        )}
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {open && <span>Déconnexion</span>}
        </button>
        <div className="flex justify-end px-2 text-muted-foreground/50">
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </div>
      </div>
    </motion.aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-40 flex justify-around rounded-none border-x-0 border-b-0 px-2 py-2 md:hidden">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px]",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}