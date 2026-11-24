import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getTicket } from "@/queueflow/lib/queue.functions";

export const Route = createFileRoute("/queueflow-ticket/$entryId")({
  head: () => ({
    meta: [
      { title: "Mon ticket — FilaPro" },
      { name: "description", content: "Suivez votre position dans la file d'attente en temps réel." },
      { property: "og:title", content: "Mon ticket d'attente" },
      { property: "og:description", content: "Votre position dans la file, mise à jour en direct." },
    ],
  }),
  component: TicketPage,
});

const statusLabels: Record<string, string> = {
  waiting: "En attente",
  serving: "C'est à vous !",
  done: "Passage terminé",
  cancelled: "Annulé",
};

function TicketPage() {
  const { entryId } = Route.useParams();
  const fetchTicket = useServerFn(getTicket);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", entryId],
    queryFn: () => fetchTicket({ data: { id: entryId } }),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="queueflow-theme flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="queueflow-theme flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Ticket introuvable</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-lift)]">
        <p className="text-sm text-muted-foreground">{data.queue_name}</p>
        <p className="mt-6 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Votre numéro
        </p>
        <p className="font-display mt-1 text-6xl font-bold text-primary">
          {String(data.ticket_number).padStart(2, "0")}
        </p>
        <p className="mt-6 font-medium">{data.full_name}</p>

        <div className="mt-6 rounded-2xl bg-secondary p-5">
          {data.status === "waiting" ? (
            <>
              <p className="text-3xl font-bold">{data.ahead}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                personne{data.ahead > 1 ? "s" : ""} devant vous
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold">{statusLabels[data.status]}</p>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Gardez cette page ouverte, elle se met à jour automatiquement.
        </p>
      </div>
    </div>
  );
}
