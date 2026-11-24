import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Inbox, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/skyfacturation")({
  head: () => ({
    meta: [
      { title: "Sky Facturation — Facturation électronique" },
      { name: "description", content: "Passerelle de facturation électronique entre Sky Vente, Sky Achat et Odoo Facturation (Peppol)." },
      { property: "og:title", content: "Sky Facturation — Facturation électronique" },
      { property: "og:description", content: "Envoi et réception des factures électroniques via Odoo et Peppol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Layout,
});

function Layout() {
  useEffect(() => {
    document.body.classList.add("sf-theme");
    return () => document.body.classList.remove("sf-theme");
  }, []);
  const cls = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground";
  return (
    <div className="sf-theme min-h-screen">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <span className="mr-4 font-semibold">Sky <span className="text-primary">Facturation</span></span>
        <Link to="/skyfacturation" activeOptions={{ exact: true }} className={cls} activeProps={{ className: "bg-secondary !text-foreground" }}><Send className="h-4 w-4" />Transmissions</Link>
        <Link to="/skyfacturation/reception" className={cls} activeProps={{ className: "bg-secondary !text-foreground" }}><Inbox className="h-4 w-4" />Réception fournisseurs</Link>
        <Link to="/" search={{} as never} className={`${cls} ml-auto`}><Home className="h-4 w-4" />Accueil</Link>
      </header>
      <main className="mx-auto max-w-6xl p-6"><Outlet /></main>
    </div>
  );
}
