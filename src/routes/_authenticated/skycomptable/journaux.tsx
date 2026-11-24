import { createFileRoute } from "@tanstack/react-router";
import { CrudTable, useTable } from "@/skycomptable/components/CrudTable";

export const Route = createFileRoute("/_authenticated/skycomptable/journaux")({
  head: () => ({
    meta: [
      { title: "Journaux — Registre" },
      { name: "description", content: "Journaux comptables de la société." },
      { property: "og:title", content: "Journaux — Registre" },
      { property: "og:description", content: "Journaux comptables de la société." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const accounts = useTable<{ id: string; code: string; name: string }>("skc_chart_accounts", "code");
  const opts = (accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }));
  return (
    <CrudTable
      table="skc_journals"
      order="code"
      title="Journaux"
      defaults={{ is_active: true, currency_code: "EUR" }}
      fields={[
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Intitulé", required: true },
        {
          name: "journal_type", label: "Type", type: "select", required: true,
          options: [
            { value: "sales", label: "Ventes" },
            { value: "purchases", label: "Achats" },
            { value: "bank", label: "Banque" },
            { value: "cash", label: "Caisse" },
            { value: "general", label: "Opérations diverses" },
          ],
        },
        { name: "default_account_id", label: "Compte par défaut", type: "select", options: opts },
        { name: "is_active", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}
