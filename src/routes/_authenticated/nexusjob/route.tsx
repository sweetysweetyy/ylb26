import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/nexusjob/hooks/use-session";
import { AppShell } from "@/nexusjob/components/app-shell";

const T = "NexusJob — Cockpit emploi IA";
const D = "Analysez votre CV, explorez les offres d'emploi et obtenez un score de compatibilité IA.";
export const Route = createFileRoute("/_authenticated/nexusjob")({
  ssr: false,
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  const { session, loading } = useSession();
  useEffect(() => {
    // Theme on <body> so dialogs and toasts keep NexusJob's look.
    document.body.classList.add("nexusjob-theme");
    return () => document.body.classList.remove("nexusjob-theme");
  }, []);
  useEffect(() => {
    // The original app provisioned these rows at signup; create them lazily here.
    const uid = session?.user.id;
    if (!uid) return;
    const sb = supabase as any;
    for (const t of ["nxj_profiles", "nxj_settings", "nxj_preferences"]) {
      const row: Record<string, unknown> = { user_id: uid };
      if (t === "nxj_profiles") row.email = session.user.email;
      sb.from(t).upsert(row, { onConflict: "user_id", ignoreDuplicates: true }).then(() => {});
    }
  }, [session]);
  if (loading || !session) {
    return <div className="nexusjob-theme grid min-h-dvh place-items-center"><Loader2 className="size-7 animate-spin" /></div>;
  }
  return (
    <div className="nexusjob-theme">
      <AppShell email={session.user.email ?? undefined}><Outlet /></AppShell>
    </div>
  );
}
