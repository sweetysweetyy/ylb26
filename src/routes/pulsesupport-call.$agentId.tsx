import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pst } from "@/pulsesupport/lib/db";
import { useLiveVoice, type LiveEvent } from "@/pulsesupport/hooks/use-live-voice";
import { Button } from "@/pulsesupport/components/ui/button";

export const Route = createFileRoute("/pulsesupport-call/$agentId")({
  head: () => ({
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Figtree:wght@400;500;600&display=swap" }],
    meta: [
      { title: "Support client — Appel vocal" },
      { name: "description", content: "Appelez notre support client et obtenez une réponse immédiate." },
      { property: "og:title", content: "Support client — Appel vocal" },
      { property: "og:description", content: "Appelez notre support client et obtenez une réponse immédiate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="pulsesupport-theme min-h-screen">
      <SupportPage />
    </div>
  ),
});

type Line = { role: "user" | "assistant"; text: string };

function SupportPage() {
  const { agentId } = Route.useParams();
  const [agent, setAgent] = useState<{ name: string; assistant_name: string; company: string } | null | undefined>();
  const [lines, setLines] = useState<Line[]>([]);
  const [working, setWorking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    setUrl(`${window.location.origin}/api/pulsesupport-live?agent=${agentId}`);
    pst(supabase).rpc("pst_get_public_agent", { _id: agentId }).then(({ data }) => setAgent(data?.[0] ?? null));
  }, [agentId]);

  function onEvent(event: LiveEvent) {
    const e = event as LiveEvent & { delta?: string };
    if (e.type === "session.input_transcript.delta" || e.type === "session.output_transcript.delta") {
      const role = e.type === "session.input_transcript.delta" ? "user" : "assistant";
      setLines((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === role) return [...prev.slice(0, -1), { role, text: last.text + (e.delta ?? "") }];
        return [...prev, { role, text: e.delta ?? "" }];
      });
    }
    if (e.type === "app.delegation.pending") setWorking(true);
    if (e.type === "app.support.action" || e.type === "session.commentary.appended") setWorking(false);
  }

  const voice = useLiveVoice(url ? { url, onEvent } : { onEvent });
  const idle = voice.status === "idle" || voice.status === "closed";
  const live = voice.status === "connected";

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  if (agent === null) return <main className="flex min-h-screen items-center justify-center text-muted-foreground">Ce support n'existe pas.</main>;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Headphones className="h-4 w-4" /> {agent?.company || agent?.name || "Support client"}
      </div>
      <h1 className="mt-3 text-center text-4xl font-bold">Parlez à {agent?.assistant_name ?? "notre assistante"}</h1>
      <p className="mt-2 text-center text-muted-foreground">Munissez-vous de vos nom, prénom et numéro de téléphone.</p>

      <div className="mt-12 flex flex-col items-center gap-5">
        {idle ? (
          <Button variant="call" size="lg" className="h-24 w-24 p-0" onClick={voice.start} aria-label="Appeler" disabled={!url}>
            <Phone className="!h-9 !w-9" />
          </Button>
        ) : (
          <Button variant="destructive" size="lg" className={`h-24 w-24 rounded-full p-0 ${live ? "pst-call-pulse" : ""}`} onClick={voice.stop} disabled={voice.status === "stopping"} aria-label="Raccrocher">
            <PhoneOff className="!h-9 !w-9" />
          </Button>
        )}
        <p role="status" className="text-sm font-medium">
          {idle ? "Appuyer pour appeler" : live ? (working ? "Recherche dans votre dossier…" : "En ligne") : voice.status === "stopping" ? "Fin de l'appel…" : "Connexion…"}
        </p>
        {live && (
          <Button variant="outline" size="sm" onClick={() => voice.setMuted(!voice.muted)}>
            {voice.muted ? <MicOff /> : <Mic />} {voice.muted ? "Réactiver le micro" : "Couper le micro"}
          </Button>
        )}
        {voice.playbackBlocked && <Button onClick={voice.resumePlayback}>Activer le son</Button>}
        {voice.error && <p role="alert" className="max-w-sm text-center text-sm text-destructive">{voice.error}</p>}
        <audio ref={voice.audioRef} className="hidden" />
      </div>

      {lines.length > 0 && (
        <div ref={scroller} className="mt-10 max-h-80 w-full max-w-lg space-y-2 overflow-y-auto rounded-2xl border bg-card p-4">
          {lines.map((l, i) => (
            <p key={i} className={`rounded-xl px-3 py-2 text-sm ${l.role === "user" ? "ml-10 bg-secondary" : "mr-10 bg-muted"}`}>{l.text}</p>
          ))}
        </div>
      )}
    </main>
  );
}
