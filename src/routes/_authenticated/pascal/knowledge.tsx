import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKnowledgeBase, updateKnowledgeBase, getProfile, updateCompanyProfile } from "@/pascal/lib/kb.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/knowledge")({ component: KnowledgePage });

const SECTIONS: Array<{ key: string; label: string; help: string }> = [
  { key: "company_description", label: "Entreprise", help: "Histoire, taille, equipe, positionnement." },
  { key: "services", label: "Services proposes", help: "Detaillez chaque offre, livrables, duree." },
  { key: "value_proposition", label: "Proposition de valeur", help: "Pourquoi vous, et pas un concurrent." },
  { key: "target_clients", label: "Clients cibles", help: "Personas, secteurs, taille." },
  { key: "pricing_notes", label: "Tarification (interne)", help: "PASCAL n'annonce pas de prix sans accord." },
  { key: "case_studies", label: "Cas clients", help: "Temoignages, chiffres, resultats." },
  { key: "values", label: "Valeurs", help: "Ce qui guide vos decisions." },
  { key: "faq", label: "FAQ", help: "Questions/reponses frequentes." },
  { key: "objections_handling", label: "Gestion des objections", help: "Trame pour les objections type." },
  { key: "meeting_proposal", label: "Modele de RDV", help: "Comment vous proposez les demos." },
];

function KnowledgePage() {
  const qc = useQueryClient();
  const kb = useQuery({ queryKey: ["kb"], queryFn: () => getKnowledgeBase() });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [form, setForm] = useState<Record<string, string>>({});
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (kb.data) {
      const next: Record<string, string> = {};
      for (const s of SECTIONS) next[s.key] = (kb.data as any)[s.key] ?? "";
      setForm(next);
    }
  }, [kb.data]);
  useEffect(() => { if (profile.data) setCompany(profile.data.company_name ?? ""); }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      await updateCompanyProfile({ data: { company_name: company } });
      await updateKnowledgeBase({ data: form as any });
    },
    onSuccess: () => { toast.success("Base de connaissance sauvegardee."); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Base de connaissance</h1>
          <p className="text-sm text-muted-foreground">Plus PASCAL en sait, plus il convertit.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="glow-primary">
          <Save className="size-4 mr-2" /> Enregistrer
        </Button>
      </header>

      <div className="surface-1 p-5">
        <Label htmlFor="company">Nom de votre entreprise</Label>
        <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme SAS" className="mt-1 max-w-md" />
      </div>

      <Accordion type="multiple" defaultValue={["company_description", "services"]} className="surface-1 px-5">
        {SECTIONS.map((s) => (
          <AccordionItem key={s.key} value={s.key}>
            <AccordionTrigger className="font-medium">{s.label}</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{s.help}</p>
              <Textarea rows={6} value={form[s.key] ?? ""} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}