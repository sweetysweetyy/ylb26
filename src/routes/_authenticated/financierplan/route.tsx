import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/financierplan/components/layout/AppShell";
import { AuthProvider } from "@/financierplan/hooks/useAuth";

const T = "FinancierPlan — Prévisionnel financier IA";
const D = "Construisez vos 12 tableaux financiers de création d'entreprise avec l'IA et exportez un dossier bancaire en PDF.";
export const Route = createFileRoute("/_authenticated/financierplan")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  // Theme on <body> too, so toasts and dialogs keep the app's look.
  useEffect(() => { document.body.classList.add("fp-theme"); return () => document.body.classList.remove("fp-theme"); }, []);
  return (
    <AuthProvider>
      <div className="fp-theme min-h-screen">
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </AuthProvider>
  );
}
