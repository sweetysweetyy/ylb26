import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/feeloo/components/app-sidebar";

const T = "Feeloo — Cockpit RH IA";
const D = "CV analysés depuis Gmail, postes importés de Google Sheets et matching candidats par l'IA.";
export const Route = createFileRoute("/_authenticated/feeloo")({
  ssr: false,
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: FeelooLayout,
});

function FeelooLayout() {
  useEffect(() => {
    // Theme on <body> so dialogs and toasts keep Feeloo's look.
    document.body.classList.add("feeloo-theme");
    return () => document.body.classList.remove("feeloo-theme");
  }, []);
  return (
    <div className="feeloo-theme min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
