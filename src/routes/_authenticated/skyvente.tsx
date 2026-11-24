import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/skyvente/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/skyvente")({
  head: () => ({
    meta: [
      { title: "Cockpit — SkyVente" },
      { name: "description", content: "Devis, commandes, factures et livrables de vos prestations." },
      { property: "og:title", content: "Cockpit — SkyVente" },
      { property: "og:description", content: "Devis, commandes, factures et livrables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SkyVenteLayout,
});

function SkyVenteLayout() {
  const [email, setEmail] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
    document.body.classList.add("skyvente-theme");
    return () => document.body.classList.remove("skyvente-theme");
  }, []);
  return (
    <div className="skyvente-theme">
      <AppShell email={email}>
        <Outlet />
      </AppShell>
    </div>
  );
}
