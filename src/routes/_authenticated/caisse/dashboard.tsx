import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import bg from "@/caisse/caisse-bg.jpg.asset.json";
import { Dashboard } from "@/caisse/components/Dashboard";

export const Route = createFileRoute("/_authenticated/caisse/dashboard")({
  head: () => ({
    meta: [
      { title: "Caisse Vocale — Assistant Odoo Point de Vente" },
      { name: "description", content: "Ouvrez votre caisse, enregistrez vos ventes et clôturez à la voix, connecté à Odoo." },
      { property: "og:title", content: "Caisse Vocale — Assistant Odoo" },
      { property: "og:description", content: "Pilotez votre Point de Vente Odoo en langage naturel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaissePage,
});

function CaissePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [veil, setVeil] = useState(35);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  useEffect(() => {
    const read = () => { const v = Number(localStorage.getItem("cv-veil")); if (localStorage.getItem("cv-veil") !== null && v >= 0 && v <= 100) setVeil(v); };
    read();
    window.addEventListener("cv-veil", read);
    return () => window.removeEventListener("cv-veil", read);
  }, []);
  return (
    <div className="caisse-theme relative min-h-screen overflow-hidden" style={{ backgroundColor: "transparent" }}>
      <img src={bg.url} alt="" width={1920} height={1088} className="fixed inset-0 -z-10 h-full w-full object-cover" />
      <div aria-hidden className="fixed inset-0 -z-10 bg-background" style={{ opacity: veil / 100 }} />
      {userId && <Dashboard userId={userId} />}
    </div>
  );
}
