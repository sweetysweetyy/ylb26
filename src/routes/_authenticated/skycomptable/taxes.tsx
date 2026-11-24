import { createFileRoute } from "@tanstack/react-router";
import { CrudTable, useTable } from "@/skycomptable/components/CrudTable";

export const Route = createFileRoute("/_authenticated/skycomptable/taxes")({
  head: () => ({
    meta: [
      { title: "Taxes — Registre" },
      { name: "description", content: "Taux de taxes applicables." },
      { property: "og:title", content: "Taxes — Registre" },
      { property: "og:description", content: "Taux de taxes applicables." },
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
      table="skc_tax_rates"
      order="code"
      title="Taxes"
      subtitle="Saisissez les taux validés pour votre territoire."
      defaults={{ applies_to: "both", is_active: true }}
      fields={[
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Intitulé", required: true },
        { name: "rate_percent", label: "Taux (%)", type: "number", required: true },
        { name: "applies_to", label: "S'applique à", type: "select", options: [{ value: "sales", label: "Ventes" }, { value: "purchases", label: "Achats" }, { value: "both", label: "Les deux" }] },
        { name: "tax_account_id", label: "Compte de taxe", type: "select", options: opts },
        { name: "is_price_included", label: "Prix TTC", type: "checkbox" },
        { name: "is_active", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}
