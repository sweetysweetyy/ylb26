import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/odooweb/components/Studio";

export const Route = createFileRoute("/_authenticated/odooweb/dashboard")({
  head: () => ({
    meta: [
      { title: "Odoo Site Studio — Créez votre site Odoo avec l'IA" },
      { name: "description", content: "Décrivez votre projet : l'IA compose et publie votre site dans le module Site Web d'Odoo." },
      { property: "og:title", content: "Odoo Site Studio" },
      { property: "og:description", content: "Créez et publiez un site web Odoo complet à partir d'un simple brief." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="odooweb-theme min-h-screen bg-background text-foreground font-sans">
      <Studio />
    </div>
  ),
});
