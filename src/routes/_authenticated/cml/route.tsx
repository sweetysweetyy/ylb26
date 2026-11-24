import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/cml/components/AppSidebar";

const T = "Holo CM — Cockpit LinkedIn IA";
const D = "Tendances, idées, rédaction, carrousels, visuels et planification de vos posts LinkedIn avec l'IA.";
export const Route = createFileRoute("/_authenticated/cml")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Layout,
});

function Layout() {
  useEffect(() => {
    // Theme on <body> so toasts and dialogs keep Holo CM's look.
    document.body.classList.add("cml-theme");
    // Ensure the user's settings row exists (the original app created it at signup).
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("cml_settings" as any).upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true }).then(() => {});
    });
    return () => document.body.classList.remove("cml-theme");
  }, []);
  return (
    <div className="cml-theme flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1400px] px-6 py-8"><Outlet /></div>
      </main>
    </div>
  );
}
