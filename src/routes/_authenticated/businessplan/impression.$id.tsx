import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bp } from "@/businessplan/lib/db";
import { DocumentRenderer } from "@/businessplan/components/plan/DocumentRenderer";
import { DEFAULT_BRAND, isPlanContent, type Brand, type PlanContent } from "@/businessplan/lib/plan-schema";

export const Route = createFileRoute("/_authenticated/businessplan/impression/$id")({
  head: () => ({
    meta: [
      { title: "Export PDF — Plan Studio" },
      { name: "description", content: "Version imprimable de votre business plan, prête pour l'export PDF." },
      { property: "og:title", content: "Export PDF — Plan Studio" },
      { property: "og:description", content: "Version imprimable de votre business plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrintView,
});

function PrintView() {
  const { id } = Route.useParams();
  const { data: plan } = useQuery({
    queryKey: ["bp-plan-print", id],
    queryFn: async () => {
      const { data, error } = await bp().from("bp_plans").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const content: PlanContent | null = isPlanContent(plan?.content) ? plan.content : null;

  useEffect(() => {
    if (content) {
      const timer = setTimeout(() => window.print(), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [content]);

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const brand: Brand = { ...DEFAULT_BRAND, ...(plan.brand as Partial<Brand>) };

  return (
    <main className="print-root min-h-screen bg-muted py-8 print:bg-white print:py-0">
      {content ? (
        <DocumentRenderer content={content} brand={brand} />
      ) : (
        <p className="text-center text-sm">Aucun contenu à imprimer.</p>
      )}
    </main>
  );
}
