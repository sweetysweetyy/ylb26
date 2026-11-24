import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/pulsesupport/types";
import { pst } from "@/pulsesupport/lib/db";
import { analyzeCall, testOdoo } from "@/pulsesupport/lib/support.functions";
import { Button } from "@/pulsesupport/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Agent = Database["public"]["Tables"]["pst_agents"]["Row"];
type Call = Database["public"]["Tables"]["pst_calls"]["Row"];

const SCOPES = [
  ["res.partner", "Lecture", "Contacts — retrouver le client"],
  ["helpdesk.ticket", "Lecture, Création", "Assistance — tickets SAV"],
  ["helpdesk.stage", "Lecture", "Assistance — état du ticket"],
  ["sale.order", "Lecture", "Ventes — commandes du client"],
  ["calendar.event", "Création", "Calendrier — rappel conseiller"],
];

export const Route = createFileRoute("/_authenticated/pulsesupport/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Vocalis" },
      { name: "description", content: "Paramètres du support vocal et historique des appels." },
      { property: "og:title", content: "Tableau de bord — Vocalis" },
      { property: "og:description", content: "Paramètres du support vocal et historique des appels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [origin, setOrigin] = useState("");
  const test = useServerFn(testOdoo);
  const analyze = useServerFn(analyzeCall);

  useEffect(() => {
    setOrigin(window.location.origin);
    let channel: ReturnType<typeof supabase.channel> | undefined;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth" });
      let { data: a } = await pst(supabase).from("pst_agents").select("*").eq("owner_id", u.user.id).maybeSingle();
      if (!a) a = (await pst(supabase).from("pst_agents").insert({ owner_id: u.user.id }).select("*").single()).data;
      setAgent(a);
      const { data: c } = await pst(supabase).from("pst_calls").select("*").order("created_at", { ascending: false }).limit(50);
      setCalls(c ?? []);
      channel = supabase
        .channel(`pst-calls-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "pst_calls" }, async () => {
          const { data } = await pst(supabase).from("pst_calls").select("*").order("created_at", { ascending: false }).limit(50);
          setCalls(data ?? []);
        })
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  if (!agent) return <main className="p-10 text-muted-foreground">Chargement…</main>;
  const set = <K extends keyof Agent>(k: K, v: Agent[K]) => setAgent({ ...agent, [k]: v });

  async function save() {
    const { id, owner_id, created_at, ...rest } = agent!;
    const { error } = await pst(supabase).from("pst_agents").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Paramètres enregistrés");
  }

  async function runTest() {
    await save();
    const r = await test();
    if (!r.ok) toast.error(r.error);
    else toast.success(`Odoo connecté. Accès : ${r.scopes.map((s) => `${s.model} ${s.ok ? "✓" : "✗"}`).join(", ")}`);
  }

  const link = `${origin}/pulsesupport-call/${agent.id}`;
  const field = (k: "name" | "assistant_name" | "company" | "ticket_model" | "callback_hours", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={agent[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mon support vocal</h1>
        <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}>Déconnexion</Button>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Lien de la page d'appel</h2>
        <div className="mt-3 flex gap-2">
          <Input readOnly value={link} />
          <Button onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Lien copié"))}>Copier</Button>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold">Assistant</h2>
          {field("company", "Entreprise")}
          {field("assistant_name", "Prénom de l'assistante")}
          <div className="space-y-1.5">
            <Label>Consignes détaillées</Label>
            <Textarea rows={5} value={agent.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Ex : délais de livraison, politique de retour…" />
          </div>
          <div className="flex items-center justify-between"><Label>Gestion SAV (tickets)</Label><Switch checked={agent.sav_enabled} onCheckedChange={(v) => set("sav_enabled", v)} /></div>
          <div className="flex items-center justify-between"><Label>Proposer un rappel conseiller</Label><Switch checked={agent.callback_enabled} onCheckedChange={(v) => set("callback_enabled", v)} /></div>
          {field("callback_hours", "Créneaux de rappel")}
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold">Connexion Odoo</h2>
          <p className="text-sm text-muted-foreground">Utilise la connexion Odoo des paramètres du Laboratoire.</p>
          {field("ticket_model", "Modèle des tickets SAV")}
          <div className="rounded-xl bg-muted p-3 text-xs">
            <p className="mb-1 font-semibold">Droits Odoo nécessaires pour l'utilisateur :</p>
            {SCOPES.map(([m, r, d]) => <p key={m}><code>{m}</code> — {r} · {d}</p>)}
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Enregistrer</Button>
            <Button variant="outline" onClick={runTest}>Tester la connexion</Button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Appels récents <span className="text-sm font-normal text-muted-foreground">(temps réel)</span></h2>
        {calls.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Aucun appel pour l'instant.</p>}
        <div className="mt-3 space-y-3">
          {calls.map((c) => (
            <details key={c.id} className="rounded-xl border p-4">
              <summary className="flex cursor-pointer justify-between text-sm">
                <span className="font-semibold">{c.customer_name ?? "Client non identifié"} · {c.outcome}</span>
                <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString("fr-FR")}</span>
              </summary>
              {c.ai_summary ? <p className="mt-3 whitespace-pre-line rounded-lg bg-secondary p-3 text-sm">{c.ai_summary}</p> : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => analyze({ data: { callId: c.id } }).catch((e) => toast.error(e.message))}>Analyser avec l'IA</Button>
              )}
              <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{c.transcript}</pre>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
