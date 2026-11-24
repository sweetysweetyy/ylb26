import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  LayoutDashboard, BookOpen, Library, CalendarRange, Users, Percent, FilePen, ScrollText, Scale, Building2, LogOut, PanelLeftClose, PanelLeftOpen, Receipt, Landmark, FileSpreadsheet, FlaskConical,
} from "lucide-react";
import { supabase } from "@/skycomptable/lib/supabase";
import { SessionProvider, useCompany, useSession } from "@/skycomptable/lib/session";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";

export const Route = createFileRoute("/_authenticated/skycomptable")({
  head: () => ({
    meta: [
      { title: "SkyComptable — Comptabilité générale" },
      { name: "description", content: "Écritures, grand livre, balance, factures, banque, FEC et TVA." },
      { property: "og:title", content: "SkyComptable — Comptabilité générale" },
      { property: "og:description", content: "La comptabilité en partie double, du journal au FEC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThemedLayout,
});

function ThemedLayout() {
  useEffect(() => {
    document.body.classList.add("skycomptable-theme");
    return () => document.body.classList.remove("skycomptable-theme");
  }, []);
  return (
    <SessionProvider>
      <div className="skycomptable-theme min-h-screen">
        <AppLayout />
      </div>
    </SessionProvider>
  );
}

const nav = [
  { to: "/skycomptable/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/skycomptable/ecritures", label: "Écritures", icon: FilePen },
  { to: "/skycomptable/grand-livre", label: "Grand livre", icon: ScrollText },
  { to: "/skycomptable/balance", label: "Balance", icon: Scale },
  { to: "/skycomptable/comptes", label: "Plan comptable", icon: BookOpen },
  { to: "/skycomptable/journaux", label: "Journaux", icon: Library },
  { to: "/skycomptable/periodes", label: "Périodes", icon: CalendarRange },
  { to: "/skycomptable/factures", label: "Factures", icon: Receipt },
  { to: "/skycomptable/banque", label: "Banque", icon: Landmark },
  { to: "/skycomptable/exports", label: "FEC & TVA", icon: FileSpreadsheet },
  { to: "/skycomptable/tiers", label: "Clients & fournisseurs", icon: Users },
  { to: "/skycomptable/taxes", label: "Taxes", icon: Percent },
  { to: "/skycomptable/societe", label: "Société", icon: Building2 },
] as const;

const roleLabel = { owner: "Propriétaire", accountant: "Comptable", viewer: "Lecture seule" };

function AppLayout() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const company = useCompany();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (ready && !session) navigate({ to: "/auth" });
  }, [ready, session, navigate]);

  if (!ready || !session || company.isLoading)
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  if (company.error)
    return <div className="p-8 text-destructive">Erreur : {(company.error as Error).message}</div>;
  if (!company.data) return <Onboarding />;

  return (
    <div className="flex min-h-screen">
      <motion.aside
        animate={{ width: collapsed ? 68 : 232 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="skc-glass sticky top-0 z-20 m-3 flex h-[calc(100vh-1.5rem)] shrink-0 flex-col overflow-hidden rounded-3xl text-sidebar-foreground skc-glow"
      >
        <div className="flex items-center gap-3 p-4">
          <div className="skc-holo-bg size-9 shrink-0 rounded-2xl skc-glow" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="skc-holo-text font-display text-lg font-semibold">Registre</div>
              <div className="truncate text-xs text-muted-foreground">{company.data.company.name}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              title={n.label}
              className="group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "!text-sidebar-accent-foreground bg-sidebar-accent skc-glow" }}
            >
              <n.icon className="h-4 w-4 shrink-0 group-[.active]:text-sidebar-primary" />
              {!collapsed && <span className="truncate">{n.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 p-3 text-xs">
          <Link to="/dashboard" title="Laboratoire" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <FlaskConical className="h-4 w-4 shrink-0" /> {!collapsed && "Laboratoire"}
          </Link>
          {!collapsed && (
            <div className="px-1">
              <div className="truncate text-sidebar-foreground">{session.user.email}</div>
              <div className="text-muted-foreground">{roleLabel[company.data.role]}</div>
            </div>
          )}
          <button title="Déconnexion" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Déconnexion"}
          </button>
          <button title={collapsed ? "Déplier" : "Replier"} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!collapsed && "Replier"}
          </button>
        </div>
      </motion.aside>
      <main className="min-w-0 flex-1 p-8">
        <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

function Onboarding() {
  const { session } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [siret, setSiret] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // id généré côté client : la société n'est lisible qu'après création de l'adhésion owner.
    const id = crypto.randomUUID();
    const { error } = await supabase.from("skc_companies").insert({ id, name, siret: siret || null, created_by: session!.user.id });
    if (!error) {
      const r = await supabase.from("skc_company_memberships").insert({ company_id: id, user_id: session!.user.id, role: "owner" });
      if (r.error) toast.error(r.error.message);
    } else toast.error(error.message);
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["company"] });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={create} className="skc-glass skc-glow w-full max-w-md space-y-4 rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">Créer votre société</h1>
        <p className="text-sm text-muted-foreground">
          Première connexion : renseignez votre société. Vous en serez le propriétaire.
        </p>
        <div className="grid gap-1">
          <Label htmlFor="n">Nom</Label>
          <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="s">SIRET (facultatif)</Label>
          <Input id="s" value={siret} onChange={(e) => setSiret(e.target.value)} />
        </div>
        <Button variant="holo" className="w-full" disabled={busy}>Créer</Button>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>
          Déconnexion
        </button>
      </form>
    </div>
  );
}
