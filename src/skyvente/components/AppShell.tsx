import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  FileText, LayoutDashboard, LogOut, Package, Settings, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { sb } from "@/skyvente/lib/supabase";

const NAV = [
  { to: "/skyvente", label: "Cockpit", icon: LayoutDashboard, exact: true },
  { to: "/skyvente/documents", label: "Documents", icon: FileText },
  { to: "/skyvente/prestations", label: "Prestations", icon: Package },
  { to: "/skyvente/contacts", label: "Contacts", icon: Users },
  { to: "/skyvente/conformite", label: "Conformité", icon: ShieldCheck },
  { to: "/skyvente/settings", label: "Paramètres", icon: Settings },
] as const;

export function AppShell({ children, email }: { children: ReactNode; email?: string }) {
  const navigate = useNavigate();
  return (
    <div className="sv-app-bg flex min-h-screen">
      <aside className="sv-glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r p-4 md:flex">
        <Link to="/skyvente" className="mb-8 flex items-center gap-2 px-2">
          <div className="sv-bg-holo grid size-9 place-items-center rounded-xl">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">Presta<span className="sv-text-holo">Flow</span></span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent/50 hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-3">
          <div className="truncate px-2 text-xs text-muted-foreground">{email}</div>
          <button
            onClick={async () => {
              await sb().auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="sv-glass sticky top-0 z-20 flex gap-1 overflow-x-auto border-b p-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground">
              <n.icon className="size-4" />{n.label}
            </Link>
          ))}
        </nav>
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 p-4 md:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
