import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/ecoflux")({
  head: () => ({ meta: [{ title: "Ecoflux — Atelier d’ingénierie économique" }, { name: "description", content: "Clarifiez, reconstruisez et optimisez les processus d’entreprise." }] }),
  component: EcofluxLayout,
});

function EcofluxLayout() {
  // Dialogs render in portals on <body>, so the theme class is also set there while the app is open.
  useEffect(() => {
    document.body.classList.add("ecoflux-theme", "dark");
    return () => document.body.classList.remove("ecoflux-theme", "dark");
  }, []);
  return <div className="ecoflux-theme min-h-screen"><Outlet /></div>;
}
