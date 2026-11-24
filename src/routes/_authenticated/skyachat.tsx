import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { FileCheck2, FileText, Home, LayoutDashboard, Package, Receipt, Settings, ShoppingCart, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/skyachat")({
  head: () => ({
    meta: [
      { title: "SkyAchat — Achats fournisseurs" },
      { name: "description", content: "Demandes de devis, bons de commande, réceptions et factures fournisseurs." },
      { property: "og:title", content: "SkyAchat — Achats fournisseurs" },
      { property: "og:description", content: "Le parcours d'achat complet, du devis à la facture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Layout,
});

const nav = [
  { to: "/skyachat/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/skyachat/documents", search: { type: "quote" }, label: "Demandes de devis", icon: FileText },
  { to: "/skyachat/documents", search: { type: "order" }, label: "Bons de commande", icon: ShoppingCart },
  { to: "/skyachat/documents", search: { type: "delivery" }, label: "Réceptions", icon: FileCheck2 },
  { to: "/skyachat/documents", search: { type: "invoice" }, label: "Factures", icon: Receipt },
  { to: "/skyachat/documents", search: { type: "credit_note" }, label: "Avoirs", icon: Receipt },
  { to: "/skyachat/contacts", label: "Contacts", icon: Users },
  { to: "/skyachat/products", label: "Produits & services", icon: Package },
  { to: "/skyachat/settings", label: "Paramètres", icon: Settings },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  useEffect(() => {
    document.body.classList.add("skyachat-theme");
    return () => document.body.classList.remove("skyachat-theme");
  }, []);
  return (
    <div className="skyachat-theme flex h-screen overflow-hidden">
      <aside className="m-3 hidden w-60 overflow-y-auto shrink-0 flex-col rounded-3xl border border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-2xl md:flex print:hidden">
        <div className="flex items-center gap-2 px-5 py-5 text-base font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl sa-bg-holo sa-animate-holo font-display font-bold text-primary-foreground sa-halo">A</span>
          <span className="font-display text-lg tracking-tight">Achats <span className="sa-text-holo">Pro</span></span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              {...("search" in n ? { search: n.search } : {})}
              activeOptions={{ includeSearch: true }}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm opacity-75 transition hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent !opacity-100 text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--holo-1)]" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <p className="truncate opacity-70">{user.email}</p>
          <Link to="/" search={{ voice: false }} className="mt-2 flex items-center gap-2 opacity-80 hover:opacity-100">
            <Home className="h-3.5 w-3.5" /> Retour à Aura
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b sa-glass px-3 py-2 md:hidden print:hidden">
          {nav.map((n) => (
            <Link key={n.label} to={n.to} {...("search" in n ? { search: n.search } : {})} className="shrink-0 rounded-full px-3 py-1 text-xs" activeProps={{ className: "sa-bg-holo text-primary-foreground" }} activeOptions={{ includeSearch: true }}>
              {n.label}
            </Link>
          ))}
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8" style={{ scrollbarGutter: "stable" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
