import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppSidebar, MobileNav } from "@/etudedemarche/components/AppSidebar";

const T = "Étude de marché";
const D = "Générez des études de marché complètes et professionnelles avec l'IA, exportables en PDF.";
export const Route = createFileRoute("/_authenticated/etudedemarche")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  // Theme on <body> too, so toasts and dialogs keep the app's look.
  useEffect(() => { document.body.classList.add("edm-theme"); return () => document.body.classList.remove("edm-theme"); }, []);
  return (
    <div className="edm-theme flex min-h-screen">
      <AppSidebar />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10"><Outlet /></main>
      <MobileNav />
    </div>
  );
}
