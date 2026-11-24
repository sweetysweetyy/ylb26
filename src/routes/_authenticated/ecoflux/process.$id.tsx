import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/ecoflux/lib/data";
import { Cockpit } from "@/ecoflux/components/Cockpit";

export const Route = createFileRoute("/_authenticated/ecoflux/process/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workspaceQuery(params.id)),
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.process.title ?? "Cockpit"} — Ecoflux` },
    { name: "description", content: "Analyse, reconstruction et traçabilité des processus : le cockpit d’ingénierie économique Ecoflux." },
    { property: "og:title", content: `${loaderData?.process.title ?? "Cockpit économique"} — Ecoflux` },
    { property: "og:description", content: "Comparez les flux existants et reconstruits et consolidez votre playbook de transformation." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProcessPage,
});
function ProcessPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(workspaceQuery(id));
  return <Cockpit key={id} w={data} />;
}