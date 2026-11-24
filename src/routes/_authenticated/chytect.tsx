import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Studio } from "@/chytect/components/Studio";

export const Route = createFileRoute("/_authenticated/chytect")({
  head: () => ({
    meta: [
      { title: "Chytect — Aménagez vos pièces avec l'IA" },
      { name: "description", content: "Importez la photo d'une pièce et ajoutez ou modifiez meubles et décor avec l'IA." },
      { property: "og:title", content: "Chytect — Aménagez vos pièces avec l'IA" },
      { property: "og:description", content: "Home staging virtuel directement sur la photo réelle de votre pièce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChytectPage,
});

function ChytectPage() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);
  if (!session) return <div className="chytect-theme chytect-bg grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <Studio key={session.user.id} session={session} />;
}
