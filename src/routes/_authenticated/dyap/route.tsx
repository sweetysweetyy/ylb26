import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomNav } from "@/dyap/components/BottomNav";

const T = "DYAP — Diaporamas IA depuis vos données";
const D = "Transformez un fichier CSV ou Excel en diaporama d'analyse avec graphiques, insights et recommandations.";
export const Route = createFileRoute("/_authenticated/dyap")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  // Theme on <body> too, so toasts and dialogs keep Dyap's look.
  useEffect(() => { document.body.classList.add("dyap-theme"); return () => document.body.classList.remove("dyap-theme"); }, []);
  return (
    <div className="dyap-theme flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1 pb-24 overflow-y-auto"><div className="mx-auto max-w-3xl"><Outlet /></div></main>
      <BottomNav />
    </div>
  );
}
