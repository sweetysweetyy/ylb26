import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/prospect/components/AppShell";

const T = "Prospect Engine — Prospection IA avec OLLY";
const D = "Décrivez les entreprises à prospecter : l'IA les trouve, construit leurs fiches et OLLY lance la prospection par Gmail.";
export const Route = createFileRoute("/_authenticated/prospect")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  // Theme on <body> too, so toasts and dialogs keep the app's look.
  useEffect(() => { document.body.classList.add("prospect-theme"); return () => document.body.classList.remove("prospect-theme"); }, []);
  return (
    <div className="prospect-theme min-h-screen">
      <AppShell>
        <Outlet />
      </AppShell>
    </div>
  );
}
