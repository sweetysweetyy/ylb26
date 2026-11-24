import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileStack, LayoutDashboard, Loader2, LogOut, Plug } from "lucide-react";
import { useAuth } from "@/facturodoo/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { connectionQuery } from "@/facturodoo/lib/queries";
import { Brand } from "@/facturodoo/components/Brand";

export const Route = createFileRoute("/_authenticated/facturodoo")({
  head: () => ({
    meta: [{ title: "FacturOdoo — Factures fournisseurs vers Odoo" }, { name: "description", content: "Scannez vos factures fournisseurs PDF et créez-les dans Odoo." }],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" }],
  }),
  component: AppLayout,
});

const nav = [
  { to: "/facturodoo", label: "Scanner", icon: LayoutDashboard, exact: true },
  { to: "/facturodoo/factures", label: "Historique", icon: FileStack },
  { to: "/facturodoo/connexion", label: "Connexion Odoo", icon: Plug },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: conn } = useQuery({ ...connectionQuery, enabled: !!user });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Temps réel : toute modification des factures / connexion rafraîchit l'UI.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("facturodoo-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "fo_invoices" }, (p) => {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        const id = (p.new as { id?: string })?.id ?? (p.old as { id?: string })?.id;
        if (id) qc.invalidateQueries({ queryKey: ["invoice", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "odoo_connections" }, () => {
        qc.invalidateQueries({ queryKey: ["odoo_connection"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="facturodoo-theme min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:flex md:flex-col md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-6"><Brand light /></div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n && n.exact }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${conn ? "bg-fo-success" : "bg-fo-warning"}`} />
            <span className="truncate">{conn ? conn.db : "Odoo non connecté"}</span>
          </div>
          <p className="mt-2 truncate text-sidebar-foreground/60">{user.email}</p>
          <button onClick={() => signOut().then(() => navigate({ to: "/auth" }))} className="mt-3 flex items-center gap-2 text-sidebar-foreground/75 hover:text-sidebar-foreground">
            <LogOut className="size-3.5" /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b bg-card/70 px-4 py-3 backdrop-blur md:hidden">
          <Brand />
          <button onClick={() => signOut().then(() => navigate({ to: "/auth" }))} aria-label="Déconnexion" className="text-muted-foreground">
            <LogOut className="size-5" />
          </button>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-10 md:py-10 md:pb-10">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-card/95 backdrop-blur md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n && n.exact }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-fo-copper" }}
            >
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
