import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGoogleStatus } from "@/prospect/lib/google.functions";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";
import { Button } from "@/prospect/components/ui/button";

export const Route = createFileRoute("/_authenticated/prospect/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres & Gmail — OLLY" },
      { name: "description", content: "Connectez Gmail et Google Agenda en OAuth pour laisser OLLY envoyer, détecter et poursuivre les conversations." },
      { property: "og:title", content: "Paramètres & Gmail — OLLY" },
      { property: "og:description", content: "Connexion sécurisée Gmail / Google Agenda pour la prospection automatisée." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const status = useServerFn(getGoogleStatus);
  const google = useQuery({ queryKey: ["pe-google-status"], queryFn: () => status() });

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Connexions et sécurité de votre cockpit de prospection." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Bento>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Gmail & Google Agenda</h2>
            <Badge variant={google.data?.connected ? "live" : "soft"}>
              {google.data?.connected ? "Connecté" : "Non connecté"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            OLLY envoie le premier email, surveille les réponses et poursuit la conversation depuis votre boîte Gmail.
            Les jetons sont stockés côté serveur uniquement.
          </p>
          {google.data?.email && <p className="mt-3 text-sm">{google.data.email}</p>}
          {google.data?.connected && !google.data.gmail && (
            <p className="mt-2 text-sm text-destructive">Reconnectez Google dans le Laboratoire pour autoriser Gmail.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">La connexion Google est partagée avec tout le Laboratoire.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="holo" asChild>
              <Link to="/settings" search={{ tab: "google" }}>
                {google.data?.connected ? "Gérer dans le Laboratoire" : "Connecter Google dans le Laboratoire"}
              </Link>
            </Button>
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display text-lg font-semibold">Automatisation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Un planificateur central vérifie régulièrement les prospections dues : détection des réponses, analyse IA,
            réponse d'OLLY, relances et conditions d'arrêt. Chaque prospect conserve son propre état de suivi.
          </p>
        </Bento>
      </div>
    </>
  );
}
