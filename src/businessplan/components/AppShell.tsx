import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  FileText,
  LayoutGrid,
  LogOut,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/businessplan", label: "Tableau de bord", icon: LayoutGrid },
  { to: "/businessplan/nouveau", label: "Nouveau plan", icon: Upload },
  { to: "/businessplan/projets", label: "Mes projets", icon: FileText },
  { to: "/businessplan/parametres", label: "Paramètres", icon: Settings },
  { to: "/dashboard", label: "Laboratoire", icon: ArrowLeft },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="bp-surface min-h-screen">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "no-print sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-[width] duration-300",
            collapsed ? "w-[68px]" : "w-[232px]",
          )}
        >
          <div className="flex items-center gap-2.5 px-4 py-5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="absolute inset-0 -z-10 bp-pulse rounded-xl bg-accent blur-md" />
            </span>
            {!collapsed && (
              <span className="font-display text-[0.95rem] font-semibold tracking-tight">Plan Studio</span>
            )}
          </div>

          <nav className="flex-1 space-y-1 px-2.5">
            {NAV.map((item) => {
              const active = item.to === "/businessplan" ? pathname === "/businessplan" || pathname === "/businessplan/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_10px_30px_-16px] shadow-primary"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 p-2.5">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              {!collapsed && <span>Réduire</span>}
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
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
  actions?: React.ReactNode;
}) {
  return (
    <header className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-border/60 px-8 py-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
