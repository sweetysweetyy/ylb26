import { createFileRoute } from "@tanstack/react-router";
import { CrudTable, useTable } from "@/skycomptable/components/CrudTable";

export const Route = createFileRoute("/_authenticated/skycomptable/tiers")({
  head: () => ({
    meta: [
      { title: "Clients et fournisseurs — Registre" },
      { name: "description", content: "Fiches clients et fournisseurs." },
      { property: "og:title", content: "Clients et fournisseurs — Registre" },
      { property: "og:description", content: "Fiches clients et fournisseurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <CrudTable
      table="skc_contacts"
      order="display_name"
      title="Clients & fournisseurs"
      defaults={{ contact_type: "company", country_code: "FR", is_active: true }}
      fields={[
        { name: "display_name", label: "Nom", required: true },
        { name: "contact_type", label: "Type", type: "select", options: [{ value: "company", label: "Société" }, { value: "person", label: "Particulier" }], hideInTable: true },
        { name: "is_customer", label: "Client", type: "checkbox" },
        { name: "is_supplier", label: "Fournisseur", type: "checkbox" },
        { name: "email", label: "E-mail", type: "email" },
        { name: "phone", label: "Téléphone" },
        { name: "siret", label: "SIRET", hideInTable: true },
        { name: "vat_number", label: "N° TVA", hideInTable: true },
        { name: "address_line1", label: "Adresse", hideInTable: true },
        { name: "postal_code", label: "Code postal", hideInTable: true },
        { name: "city", label: "Ville" },
      ]}
    />
  );
}
