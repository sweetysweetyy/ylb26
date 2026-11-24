import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGoogleConnection, startGoogleOauth, disconnectGoogle } from "@/pascal/lib/google.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plug, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/connections")({ component: ConnectionsPage });

function ConnectionsPage() {
  const qc = useQueryClient();
  const conn = useQuery({ queryKey: ["google-conn"], queryFn: () => getGoogleConnection() });

  const start = useMutation({
    mutationFn: async () => startGoogleOauth({ data: { origin: window.location.origin } }),
    onSuccess: (r) => { window.location.href = r.url; },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur OAuth"),
  });
  const disc = useMutation({
    mutationFn: () => disconnectGoogle(),
    onSuccess: () => { toast.success("Compte Google deconnecte."); qc.invalidateQueries({ queryKey: ["google-conn"] }); },
  });

  const c = conn.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold">Connexion Google</h1>
        <p className="text-sm text-muted-foreground">PASCAL utilise votre compte Google pour lire vos Sheets et envoyer/recevoir les emails Gmail.</p>
      </header>

      <div className="surface-1 p-6">
        {c ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-success"><CheckCircle2 className="size-5" /><span className="font-medium">Connecte</span></div>
              <div className="mt-2 font-mono text-sm">{c.google_email}</div>
              <div className="text-xs text-muted-foreground mt-1">Depuis le {new Date(c.connected_at).toLocaleString("fr-FR")}</div>
              <div className="text-xs text-muted-foreground mt-3 break-all">Scopes : {c.scopes}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => start.mutate()} disabled={start.isPending}><ExternalLink className="size-4 mr-2" /> Reconnecter</Button>
              <Button variant="ghost" onClick={() => disc.mutate()} disabled={disc.isPending}><Trash2 className="size-4 mr-2" /> Deconnecter</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Plug className="size-10 text-primary mx-auto" />
            <div>
              <div className="font-medium">Aucun compte Google connecte.</div>
              <p className="text-sm text-muted-foreground mt-1">PASCAL a besoin d'acceder a Google Sheets et Gmail pour fonctionner.</p>
            </div>
            <Button onClick={() => start.mutate()} disabled={start.isPending} className="glow-primary">
              <Plug className="size-4 mr-2" /> Connecter mon compte Google
            </Button>
          </div>
        )}
      </div>

      <div className="surface-1 p-5 text-xs text-muted-foreground space-y-2">
        <div className="font-medium text-foreground">Securite</div>
        <p>Votre refresh token Google est chiffre (AES-256-GCM) avant stockage. Il n'est jamais expose au navigateur. PASCAL n'envoie d'email qu'a partir des sources que vous activez.</p>
        <p>La connexion Google est partagee avec tout le Laboratoire (Parametres → Google).</p>
      </div>
    </div>
  );
}