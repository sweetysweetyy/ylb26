import { eco } from "@/ecoflux/lib/db";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Building2, FolderOpen, Loader2, Plus, Sparkles, Activity, CheckCircle2, Network, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dossiersQuery, writeClarification } from "@/ecoflux/lib/data";
import { clarifyProcess } from "@/ecoflux/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecoflux/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dossiersQuery),
  head: () => ({ meta: [
    { title: "Ecoflux — Atelier d’ingénierie économique" },
    { name: "description", content: "Vos dossiers clients et votre atelier d’analyse économique : clarifiez, reconstruisez et optimisez les processus d’entreprise." },
    { property: "og:title", content: "Ecoflux — Atelier d’ingénierie économique" },
    { property: "og:description", content: "De la réalité terrain au playbook de transformation : vos audits économiques réunis dans Ecoflux." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const { data: dossiers } = useSuspenseQuery(dossiersQuery);
  const [clientId, setClientId] = useState(dossiers[0]?.id ?? "");
  const [processId, setProcessId] = useState(dossiers[0]?.processes[0]?.id ?? "");
  const [raw, setRaw] = useState(dossiers[0]?.processes[0]?.raw_input ?? "");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const clarify = useServerFn(clarifyProcess);
  const client = dossiers.find((c) => c.id === clientId);
  const process = client?.processes.find((p) => p.id === processId);
  async function launch() {
    if (!client || raw.trim().length < 10) return;
    if (process && raw === process.raw_input) { await navigate({ to: "/ecoflux/process/$id", params: { id: process.id } }); return; }
    if (process && !window.confirm("Cette analyse remplacera la modélisation actuelle. Continuer ?")) return;
    setPending(true);
    try {
      const name = process?.title ?? title.trim();
      const result = await clarify({ data: { title: name, client: client.name, rawInput: raw } });
      let id = process?.id;
      if (!id) {
        const { data, error } = await eco(supabase).from("eco_processes").insert({ client_id: client.id, title: name, raw_input: raw }).select().single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await eco(supabase).from("eco_processes").update({ raw_input: raw }).eq("id", id);
        if (error) throw error;
      }
      await writeClarification(id, result);
      await qc.invalidateQueries({ queryKey: ["dossiers"] });
      await navigate({ to: "/ecoflux/process/$id", params: { id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "L’analyse a échoué."); }
    finally { setPending(false); }
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  async function saveClient(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { data, error } = await eco(supabase).from("eco_clients").insert({ name: clientName.trim(), industry: industry.trim() || null }).select().single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["dossiers"] });
      setClientId(data.id); setProcessId(""); setRaw(""); setTitle(""); setNewClient(false); setClientName(""); setIndustry("");
      toast.success("Dossier client créé");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de créer le client."); }
    finally { setPending(false); }
  }
  return <main className="atelier-shell mx-auto max-w-[1440px] p-5 md:p-8">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><Link to="/ecoflux/dashboard" className="flex items-center gap-3"><span className="eco-aig size-8 rounded-lg" /><span className="text-xl font-semibold">Ecoflux</span></Link><span className="text-xs text-muted-foreground">INGÉNIERIE ÉCONOMIQUE</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setNewClient(true)}><Plus /> Nouveau client</Button><Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Déconnexion</Button></div></header>
    <section className="mb-8"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><p className="section-label mb-2 text-eco-violet">ATELIER</p><h1 className="text-2xl font-semibold">Ingénierie économique</h1></div><div className="flex flex-wrap gap-2"><select aria-label="Entreprise" className="atelier-select" value={clientId} onChange={(e) => { const c = dossiers.find((d) => d.id === e.target.value); setClientId(e.target.value); setProcessId(c?.processes[0]?.id ?? ""); setRaw(c?.processes[0]?.raw_input ?? ""); }}><option value="" disabled>Choisir un client</option>{dossiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Processus" className="atelier-select max-w-full" value={processId} onChange={(e) => { setProcessId(e.target.value); setRaw(client?.processes.find((p) => p.id === e.target.value)?.raw_input ?? ""); }}><option value="">Nouveau processus</option>{client?.processes.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}</select></div></div>
      <div className="border-y border-border bg-card/35 py-5"><label className="mb-3 block text-xs text-muted-foreground" htmlFor="raw">Processus brut</label>{!process && <input aria-label="Nom du processus" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du processus" className="mb-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />}<textarea id="raw" rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Décrivez le processus observé, ses acteurs, ses délais et ses coûts…" className="w-full resize-y rounded-lg border border-border bg-background p-4 text-sm leading-relaxed outline-none focus:border-eco-violet" /><div className="mt-4 flex justify-end"><Button className="eco-aig rounded-full text-primary-foreground" onClick={launch} disabled={pending || !client || raw.trim().length < 10 || (!process && !title.trim())}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />}{pending ? "Analyse en cours…" : process && raw === process.raw_input ? "Ouvrir le cockpit" : "Lancer l’ingénierie économique"}</Button></div></div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">{[{ icon: CheckCircle2, title: "1 · Clarification", value: "Réalité terrain", color: "text-eco-cyan" }, { icon: Network, title: "2 · Analyse", value: "As-Is → To-Be", color: "text-eco-violet" }, { icon: Activity, title: "3 · Résultat", value: "L’Ultime Solution", color: "text-eco-emerald" }].map((s) => <div key={s.title} className="border-l border-border px-4 py-3"><div className={`mb-3 flex items-center gap-2 text-xs ${s.color}`}><s.icon className="size-4" />{s.title}</div><p className="text-lg font-medium">{s.value}</p><div className="mt-4 flex items-center gap-2"><span className="h-1 flex-1 rounded-full bg-eco-eco-cyan/40" /><span className="h-1 flex-1 rounded-full bg-eco-eco-violet/40" /><span className="h-1 flex-1 rounded-full bg-eco-eco-emerald/40" /></div></div>)}</div>
    </section>
    <section className="border-t border-border pt-6"><div className="mb-5 flex items-center gap-2"><FolderOpen className="size-5 text-eco-violet" /><h2 className="text-lg font-semibold">Dossiers clients</h2><span className="ml-2 text-xs text-muted-foreground">{dossiers.length} entreprises</span></div><div className="grid gap-4 md:grid-cols-2">{dossiers.map((c) => <article key={c.id} className="eco-glass rounded-lg p-5"><div className="mb-4 flex items-center gap-3"><Building2 className="size-5 text-eco-cyan" /><div><h3 className="font-semibold">{c.name}</h3><p className="mt-1 text-xs text-muted-foreground">{c.industry ?? "Secteur non renseigné"}</p></div></div>{c.processes.map((p) => <Link key={p.id} to="/ecoflux/process/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 border-t border-border py-3 text-sm transition-colors hover:text-eco-cyan"><div><span>{p.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{p.reference ?? "Nouveau dossier"} · {p.status === "reengineering" ? "Reconstruction" : p.status === "completed" ? "Terminé" : "Clarification"}</span></div><ArrowUpRight className="size-4 shrink-0" /></Link>)}{!c.processes.length && <p className="text-xs text-muted-foreground">Aucun processus analysé.</p>}</article>)}</div></section>
    <Dialog open={newClient} onOpenChange={setNewClient}><DialogContent><DialogHeader><DialogTitle>Nouveau dossier client</DialogTitle></DialogHeader><form onSubmit={saveClient} className="space-y-4"><label className="block text-sm">Entreprise<input required aria-label="Nom de l’entreprise" value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-3" /></label><label className="block text-sm">Secteur<input aria-label="Secteur" value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-3" /></label><Button type="submit" disabled={pending || !clientName.trim()} className="w-full">{pending ? <Loader2 className="animate-spin" /> : <Plus />}Créer le dossier</Button></form></DialogContent></Dialog>
  </main>;
}
