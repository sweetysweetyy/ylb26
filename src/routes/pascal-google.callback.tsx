import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/pascal/lib/use-auth";
import { completeGoogleOauth } from "@/pascal/lib/google.functions";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Search = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/pascal-google/callback")({
  component: GoogleCallback,
  validateSearch: (s) => Search.parse(s),
});

function GoogleCallback() {
  const { code, state, error } = Route.useSearch();
  const session = useSession();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (ran.current) return;
    if (error) { setStatus("error"); setMessage(error); return; }
    if (!code || !state) { setStatus("error"); setMessage("Parametres OAuth manquants."); return; }
    if (session === undefined) return;
    if (!session) { setStatus("error"); setMessage("Vous devez etre connecte a PASCAL."); return; }
    ran.current = true;
    completeGoogleOauth({ data: { code, state, origin: window.location.origin } })
      .then((r) => {
        setStatus("ok");
        setMessage(`Compte Google ${r.email} connecte.`);
        toast.success("Google connecte avec succes.");
        setTimeout(() => navigate({ to: "/pascal/connections" }), 1200);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Erreur inconnue");
      });
  }, [code, state, error, session, navigate]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="surface-1 p-8 max-w-md w-full text-center space-y-4">
        <div className="flex justify-center"><Sparkles className="size-8 text-primary" /></div>
        {status === "pending" && <><h1 className="text-xl font-semibold">Connexion en cours...</h1><p className="text-sm text-muted-foreground">PASCAL recupere les autorisations Google.</p></>}
        {status === "ok" && <><CheckCircle2 className="size-10 text-success mx-auto" /><h1 className="text-xl font-semibold">{message}</h1></>}
        {status === "error" && <><AlertCircle className="size-10 text-destructive mx-auto" /><h1 className="text-xl font-semibold">Echec de la connexion</h1><p className="text-sm text-muted-foreground break-words">{message}</p><a href="/pascal/connections" className="text-sm text-primary underline">Retour aux connexions</a></>}
      </div>
    </div>
  );
}