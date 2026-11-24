import { createFileRoute } from "@tanstack/react-router";
import { CrudTable, useTable } from "@/skycomptable/components/CrudTable";

export const Route = createFileRoute("/_authenticated/skycomptable/comptes")({
  head: () => ({
    meta: [
      { title: "Plan comptable — Registre" },
      { name: "description", content: "Comptes de votre plan comptable." },
      { property: "og:title", content: "Plan comptable — Registre" },
      { property: "og:description", content: "Comptes de votre plan comptable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const types = [
  { value: "asset", label: "Actif" },
  { value: "liability", label: "Passif" },
  { value: "equity", label: "Capitaux propres" },
  { value: "income", label: "Produit" },
  { value: "expense", label: "Charge" },
];

function Page() {
  return (
    <CrudTable
      table="skc_chart_accounts"
      order="code"
      title="Plan comptable"
      subtitle="Créez vos comptes après validation par votre expert-comptable."
      defaults={{ is_active: true }}
      fields={[
        { name: "code", label: "Numéro", required: true },
        { name: "name", label: "Intitulé", required: true },
        { name: "account_type", label: "Nature", type: "select", options: types, required: true },
        { name: "is_reconcilable", label: "Lettrable", type: "checkbox" },
        { name: "is_active", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}
