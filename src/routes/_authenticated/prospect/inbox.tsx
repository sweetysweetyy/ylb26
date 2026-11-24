import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Badge } from "@/prospect/components/ui/badge";

export const Route = createFileRoute("/_authenticated/prospect/inbox")({
  head: () => ({
    meta: [
      { title: "Conversations OLLY — OLLY" },
      { name: "description", content: "Historique complet des emails envoyés et des réponses analysées par l'agent commercial OLLY." },
      { property: "og:title", content: "Conversations OLLY — OLLY" },
      { property: "og:description", content: "Chaque prospect garde sa conversation indépendante et sa mémoire." },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { data } = useQuery({
    queryKey: ["inbox"],
    queryFn: async () =>
      (
        await supabase
          .from("pe_messages")
          .select("id, direction, subject, body, created_at, analysis")
          .order("created_at", { ascending: false })
          .limit(80)
      ).data ?? [],
    refetchInterval: 10000,
  });

  return (
    <>
      <PageHeader title="Conversations" subtitle="Tous les échanges gérés par OLLY, dans l'ordre chronologique inverse." />
      <div className="space-y-3">
        {(data ?? []).map((message) => (
          <Bento key={message.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={message.direction === "OUTBOUND" ? "live" : "soft"}>
                {message.direction === "OUTBOUND" ? "OLLY" : "Prospect"}
              </Badge>
              {(message.analysis as { intent?: string } | null)?.intent && (
                <Badge variant="outline">{(message.analysis as { intent?: string }).intent}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(message.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">{message.subject ?? "(sans objet)"}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{message.body}</p>
          </Bento>
        ))}
        {(data ?? []).length === 0 && (
          <Bento>
            <p className="text-sm text-muted-foreground">Aucune conversation pour l'instant.</p>
          </Bento>
        )}
      </div>
    </>
  );
}
