import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

let creating = false;
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { existingNumbers } from "@/skyachat/lib/queries";
import { DEFAULT_SETTINGS, nextNumber, prefixFor } from "@/skyachat/lib/doc";

export const Route = createFileRoute("/_authenticated/skyachat/documents/new")({
  validateSearch: z.object({ type: z.enum(["quote", "order", "delivery", "invoice", "credit_note"]).catch("quote") }),
  head: () => ({
    meta: [
      { title: "Nouveau document — SkyAchat" },
      { name: "description", content: "Création d'un nouveau document d'achat." },
      { property: "og:title", content: "Nouveau document — SkyAchat" },
      { property: "og:description", content: "Création d'un document d'achat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewDoc,
});

function NewDoc() {
  const { type } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    // Module-level lock: survives remounts/StrictMode so only one document is created.
    if (creating) return;
    creating = true;
    (async () => {
      try {
      const { data: s } = await supabase.from("sa_settings").select("*").maybeSingle();
      const number = nextNumber(prefixFor(type, s), new Date().getFullYear(), await existingNumbers(type));
      const { data, error } = await supabase
        .from("sa_documents")
        .insert({ type, number, payment_terms: s?.default_payment_terms ?? DEFAULT_SETTINGS.default_payment_terms, currency: s?.currency ?? "EUR" })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/skyachat/documents/$id", params: { id: data.id }, replace: true });
      } finally {
        setTimeout(() => { creating = false; }, 1500);
      }
    })();
  }, [type, navigate]);
  return <p className="text-muted-foreground">Création du document…</p>;
}
