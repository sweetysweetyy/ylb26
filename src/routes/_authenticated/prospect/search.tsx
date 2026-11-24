import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { runSearch } from "@/prospect/lib/search.functions";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Button } from "@/prospect/components/ui/button";
import { Badge } from "@/prospect/components/ui/badge";
import { Textarea } from "@/prospect/components/ui/textarea";
import { Input } from "@/prospect/components/ui/input";

export const Route = createFileRoute("/_authenticated/prospect/search")({
  head: () => ({
    meta: [
      { title: "Recherche IA d'entreprises — OLLY" },
      {
        name: "description",
        content:
          "Décrivez en langage naturel les entreprises à prospecter : l'IA structure la demande, cherche sur le web et construit les fiches.",
      },
      { property: "og:title", content: "Recherche IA d'entreprises — OLLY" },
      { property: "og:description", content: "De la phrase au portefeuille de prospects qualifiés en une recherche." },
    ],
  }),
  component: SearchPage,
});

const EXAMPLES = [
  "Je veux 10 centres de formation en alternance à La Réunion",
  "20 agences immobilières indépendantes à La Réunion intéressées par la gestion des leads",
  "8 cabinets comptables à Saint-Denis qui recrutent",
];

function SearchPage() {
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(10);
  const navigate = useNavigate();
  const run = useServerFn(runSearch);

  const searches = useQuery({
    queryKey: ["searches"],
    queryFn: async () =>
      (await supabase.from("pe_searches").select("*").order("created_at", { ascending: false }).limit(12)).data ?? [],
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: async () => run({ data: { query, quantity } }),
    onSuccess: (result) => {
      toast.success(`${result.companies} fiches entreprises construites`);
      void searches.refetch();
      void navigate({ to: "/prospect/companies" });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Recherche intelligente"
        subtitle="Décrivez votre cible. L'IA comprend, cherche sur le web, vérifie et construit chaque fiche."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Bento span="xl:col-span-2">
          <Textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={5}
            placeholder="Ex. : je veux 10 centres de formation en alternance à La Réunion"
            className="resize-none border-0 bg-secondary/50 text-base"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Nombre</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-20"
              />
            </div>
            <Button
              variant="holo"
              disabled={mutation.isPending || query.trim().length < 6}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Recherche approfondie en cours…" : "Lancer la recherche"}
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display mb-4 text-lg font-semibold">Historique</h2>
          <div className="space-y-3">
            {(searches.data ?? []).map((search) => (
              <div key={search.id} className="rounded-2xl bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm">{search.raw_query}</p>
                  <Badge variant={search.status === "DONE" ? "soft" : "live"}>{search.status}</Badge>
                </div>
                {search.progress && <p className="mt-1 text-xs text-muted-foreground">{search.progress}</p>}
                {search.error && <p className="mt-1 text-xs text-destructive">{search.error}</p>}
              </div>
            ))}
            {(searches.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune recherche pour le moment.</p>
            )}
          </div>
        </Bento>
      </div>
    </>
  );
}
