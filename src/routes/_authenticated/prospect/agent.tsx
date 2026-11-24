import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { peSupabase as supabase } from "@/prospect/lib/db";
import { Bento, PageHeader } from "@/prospect/components/AppShell";
import { Button } from "@/prospect/components/ui/button";
import { Input } from "@/prospect/components/ui/input";
import { Label } from "@/prospect/components/ui/label";
import { Textarea } from "@/prospect/components/ui/textarea";

const BOOKS = [
  "Comment se faire des amis — Dale Carnegie",
  "The Psychology of Selling — Brian Tracy",
  "SPIN Selling — Neil Rackham",
  "The Challenger Sale — Dixon & Adamson",
  "To Sell Is Human — Daniel H. Pink",
  "Never Split the Difference — Chris Voss",
  "Selling to Win — Richard Denny",
  "The Sales Acceleration Formula — Mark Roberge",
  "L'art de convaincre sans manipuler — Hervé Bommelaer",
  "The Little Red Book of Selling — Jeffrey Gitomer",
];

const MODELS = [
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-5-nano",
  "google/gemini-3.6-flash",
];

export const Route = createFileRoute("/_authenticated/prospect/agent")({
  head: () => ({
    meta: [
      { title: "Agent OLLY — configuration commerciale" },
      { name: "description", content: "Configurez OLLY : offre, ton, objectif, relances, créneaux de rendez-vous et modèles d'IA." },
      { property: "og:title", content: "Agent OLLY — configuration commerciale" },
      { property: "og:description", content: "L'expertise des 10 meilleurs livres de vente, réglée pour votre offre." },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const settings = useQuery({
    queryKey: ["agent-settings"],
    queryFn: async () => (await supabase.from("pe_settings").select("*").maybeSingle()).data,
  });
  const [form, setForm] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (settings.data) {
      setForm({
        sender_name: settings.data.sender_name ?? "",
        company_name: settings.data.company_name ?? "",
        offer_description: settings.data.offer_description ?? "",
        value_proposition: settings.data.value_proposition ?? "",
        tone: settings.data.tone ?? "",
        target_persona: settings.data.target_persona ?? "",
        cta_type: settings.data.cta_type ?? "",
        signature: settings.data.signature ?? "",
        max_follow_ups: settings.data.max_follow_ups ?? 3,
        follow_up_delay_hours: settings.data.follow_up_delay_hours ?? 72,
        check_interval_minutes: settings.data.check_interval_minutes ?? 30,
        meeting_slots: settings.data.meeting_slots ?? "",
        model_analysis: settings.data.model_analysis ?? MODELS[0]!,
        model_research: settings.data.model_research ?? MODELS[0]!,
        model_writing: settings.data.model_writing ?? MODELS[0]!,
      });
    }
  }, [settings.data]);

  const save = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("pe_settings")
      .upsert({ ...form, user_id: user.user.id } as never, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("Configuration d'OLLY enregistrée");
      void settings.refetch();
    }
  };

  const field = (key: string, label: string, textarea = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      {textarea ? (
        <Textarea
          id={key}
          rows={4}
          value={String(form[key] ?? "")}
          onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.value }))}
        />
      ) : (
        <Input
          id={key}
          value={String(form[key] ?? "")}
          onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.value }))}
        />
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Agent OLLY"
        subtitle="Spécialiste communication & vente. Son expertise est calibrée sur les 10 meilleurs ouvrages de vente."
        actions={
          <Button variant="holo" onClick={() => void save()}>
            Enregistrer
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Bento span="xl:col-span-2">
          <h2 className="font-display mb-4 text-lg font-semibold">Votre offre & votre voix</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {field("sender_name", "Nom de l'expéditeur")}
            {field("company_name", "Votre société")}
            {field("tone", "Ton souhaité")}
            {field("target_persona", "Persona cible")}
            {field("cta_type", "Appel à l'action")}
            {field("signature", "Signature")}
          </div>
          <div className="mt-4 grid gap-4">
            {field("offer_description", "Description de l'offre", true)}
            {field("value_proposition", "Propositions de valeur", true)}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display mb-4 text-lg font-semibold">Cadence & rendez-vous</h2>
          <div className="grid gap-4">
            {field("max_follow_ups", "Nombre maximum de relances")}
            {field("follow_up_delay_hours", "Délai entre relances (heures)")}
            {field("check_interval_minutes", "Fréquence de vérification Gmail (minutes)")}
            {field("meeting_slots", "Créneaux de rendez-vous proposés", true)}
          </div>
        </Bento>

        <Bento>
          <h2 className="font-display mb-4 text-lg font-semibold">Modèles d'IA</h2>
          <div className="space-y-4">
            {[
              ["model_analysis", "Analyse de la demande"],
              ["model_research", "Recherche & enrichissement"],
              ["model_writing", "Rédaction des emails"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <select
                  value={String(form[key!] ?? MODELS[0])}
                  onChange={(event) => setForm((state) => ({ ...state, [key!]: event.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Bento>

        <Bento span="xl:col-span-2">
          <h2 className="font-display mb-3 text-lg font-semibold">Socle d'expertise d'OLLY</h2>
          <div className="flex flex-wrap gap-2">
            {BOOKS.map((book) => (
              <span key={book} className="rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
                {book}
              </span>
            ))}
          </div>
        </Bento>
      </div>
    </>
  );
}
