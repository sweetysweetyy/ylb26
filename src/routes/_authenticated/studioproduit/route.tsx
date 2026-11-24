import { Outlet, createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/studioproduit")({
  component: StudioProduitLayout,
});

function StudioProduitLayout() {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="studioproduit-theme min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/studioproduit/dashboard" className="font-display text-lg">
            Studio<span className="sp-text-gradient"> Produit</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" search={{} as never} className="text-xs text-muted-foreground hover:text-foreground">Aura</Link>
            <span className="hidden text-muted-foreground sm:inline">{session?.user.email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
