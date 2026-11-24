import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/businessplan/components/AppShell";

const T = "Business Plan Pro Studio";
const D = "Transformez votre business plan PDF en dossier de financement professionnel avec tableaux et graphiques.";
export const Route = createFileRoute("/_authenticated/businessplan")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  const { pathname } = useLocation();
  // Theme on <body> too, so toasts and dialogs keep the app's look.
  useEffect(() => { document.body.classList.add("bp-theme"); return () => document.body.classList.remove("bp-theme"); }, []);
  if (pathname.startsWith("/businessplan/impression/")) return <div className="bp-theme"><Outlet /></div>;
  return <div className="bp-theme"><AppShell><Outlet /></AppShell></div>;
}
