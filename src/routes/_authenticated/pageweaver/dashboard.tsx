import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pw } from "@/pageweaver/lib/db";
import { Button } from "@/components/ui/button";
import { Logo } from "@/pageweaver/components/Logo";

export const Route = createFileRoute("/_authenticated/pageweaver/dashboard")({
  head: () => ({
    meta: [
      { title: "Mes projets — Maquettiste" },
      { name: "description", content: "Retrouvez et gérez vos projets de pages web." },
      { property: "og:title", content: "Mes projets — Maquettiste" },
      { property: "og:description", content: "Vos projets de maquettes web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Projects,
});

type P = { id: string; name: string; brief: string; updated_at: string };

function Projects() {
  const [items, setItems] = useState<P[] | null>(null);
  const nav = useNavigate();

  async function load() {
    const { data } = await pw(supabase).from("pw_projects").select("id,name,brief,updated_at").order("updated_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const { data, error } = await pw(supabase).from("pw_projects").insert({ name: "Nouveau projet" }).select("id").single();
    if (!error && data) nav({ to: "/pageweaver/project/$id", params: { id: data.id } });
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ce projet et toutes ses sections ?")) return;
    await pw(supabase).from("pw_projects").delete().eq("id", id);
    load();
  }

  return (
    <div className="pw-board-grid min-h-screen" style={{ backgroundSize: "22px 22px" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between p-5">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-extrabold md:text-4xl">Mes projets</h1>
          <Button onClick={create}>
            <Plus className="h-4 w-4" /> Nouveau projet
          </Button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {items?.length === 0 && (
            <button onClick={create} className="pw-panel grid h-40 place-items-center border-dashed text-muted-foreground hover:text-foreground">
              Créez votre premier projet
            </button>
          )}
          {items?.map((p) => (
            <div key={p.id} className="pw-panel group relative p-5 transition hover:-translate-y-0.5">
              <Link to="/pageweaver/project/$id" params={{ id: p.id }} className="block">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.brief || "Aucune description pour l'instant."}</p>
                <p className="mt-4 font-mono text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString("fr-FR")}</p>
              </Link>
              <button
                aria-label="Supprimer"
                onClick={() => remove(p.id)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
