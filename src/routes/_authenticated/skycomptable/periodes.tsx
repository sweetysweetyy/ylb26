import { createFileRoute } from "@tanstack/react-router";
import { CrudTable, useTable } from "@/skycomptable/components/CrudTable";

export const Route = createFileRoute("/_authenticated/skycomptable/periodes")({
  head: () => ({
    meta: [
      { title: "Périodes — Registre" },
      { name: "description", content: "Exercices et périodes comptables." },
      { property: "og:title", content: "Périodes — Registre" },
      { property: "og:description", content: "Exercices et périodes comptables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <CrudTable
      table="skc_fiscal_periods"
      order="start_date"
      title="Périodes comptables"
      subtitle="Une écriture ne peut être validée que dans une période ouverte (non verrouillée)."
      fields={[
        { name: "name", label: "Nom", required: true },
        { name: "start_date", label: "Début", type: "date", required: true },
        { name: "end_date", label: "Fin", type: "date", required: true },
        { name: "is_locked", label: "Verrouillée", type: "checkbox" },
      ]}
    />
  );
}
