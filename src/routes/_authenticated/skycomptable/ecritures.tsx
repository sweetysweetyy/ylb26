import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Undo2 } from "lucide-react";
import { supabase } from "@/skycomptable/lib/supabase";
import { canEdit, useCompany } from "@/skycomptable/lib/session";
import { PageHeader, selectCls, useTable } from "@/skycomptable/components/CrudTable";
import { entryTotals, formatEUR, validateEntry, type DraftLine } from "@/skycomptable/lib/accounting";
import { Button } from "@/skycomptable/components/ui/button";
import { Input } from "@/skycomptable/components/ui/input";
import { Label } from "@/skycomptable/components/ui/label";
import { Badge } from "@/skycomptable/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/skycomptable/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/skycomptable/ecritures")({
  head: () => ({
    meta: [
      { title: "Écritures — Registre" },
      { name: "description", content: "Saisie et validation des écritures en partie double." },
      { property: "og:title", content: "Écritures — Registre" },
      { property: "og:description", content: "Saisie et validation des écritures en partie double." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { entry?: string } => (typeof s.entry === "string" ? { entry: s.entry } : {}),
  component: Page,
});

type Account = { id: string; code: string; name: string };
type Journal = { id: string; code: string; name: string };
type Entry = {
  id: string; journal_id: string; entry_number: string | null; entry_date: string; reference: string | null;
  description: string; status: "draft" | "posted" | "cancelled"; source_type: string | null; source_id: string | null;
  skc_accounting_entry_lines: { id: string; line_number: number; account_id: string; label: string; debit: string; credit: string }[];
};

const emptyLine = (): DraftLine => ({ account_id: "", label: "", debit: 0, credit: 0 });

function Page() {
  const qc = useQueryClient();
  const { data: ctx } = useCompany();
  const companyId = ctx?.company.id;
  const editable = canEdit(ctx?.role);
  const accounts = useTable<Account>("skc_chart_accounts", "code");
  const skc_journals = useTable<Journal>("skc_journals", "code");
  const acc = new Map((accounts.data ?? []).map((a) => [a.id, a]));
  const jrn = new Map((skc_journals.data ?? []).map((j) => [j.id, j]));
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Entry | null>(null);

  const entries = useQuery({
    queryKey: ["skc_accounting_entries", companyId, "with-lines"],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skc_accounting_entries")
        .select("*, skc_accounting_entry_lines(*)")
        .eq("company_id", companyId!)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, skc_accounting_entry_lines: (e as Entry).skc_accounting_entry_lines ?? [] })) as Entry[];
    },
  });
  const { entry: focus } = Route.useSearch();
  useEffect(() => {
    if (focus && entries.data) { const e = entries.data.find((x) => x.id === focus); if (e) setDetail(e); }
  }, [focus, entries.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["skc_accounting_entries"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  };

  const post = useMutation({
    mutationFn: async (e: Entry) => {
      const errs = validateEntry((e.skc_accounting_entry_lines ?? []).map((l) => ({ ...l, debit: +l.debit, credit: +l.credit })));
      if (errs.length) throw new Error(errs.join(" "));
      const j = jrn.get(e.journal_id);
      const year = e.entry_date.slice(0, 4);
      const prefix = `${j?.code ?? "J"}-${year}-`;
      const { count } = await supabase
        .from("skc_accounting_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("journal_id", e.journal_id)
        .like("entry_number", `${prefix}%`);
      const number = prefix + String((count ?? 0) + 1).padStart(4, "0");
      const { error } = await supabase
        .from("skc_accounting_entries")
        .update({ status: "posted", entry_number: number })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Écriture validée"); setDetail(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skc_accounting_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setDetail(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reverse = useMutation({
    mutationFn: async (e: Entry) => {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("skc_accounting_entries").insert({
        id, company_id: companyId, journal_id: e.journal_id, entry_date: new Date().toISOString().slice(0, 10),
        reference: e.entry_number, description: `Extourne de ${e.entry_number} — ${e.description}`, status: "draft",
        source_type: "reversal", source_id: e.id,
      });
      if (error) throw error;
      const { error: e2 } = await supabase.from("skc_accounting_entry_lines").insert(
        (e.skc_accounting_entry_lines ?? []).map((l) => ({
          company_id: companyId, entry_id: id, line_number: l.line_number, account_id: l.account_id,
          label: `Extourne ${l.label}`, debit: l.credit, credit: l.debit,
        })),
      );
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Brouillon d'extourne créé — vérifiez-le puis validez-le."); setDetail(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Écritures"
        subtitle="Une écriture validée est définitive ; corrigez-la par une extourne."
        action={editable && <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Nouvelle écriture</Button>}
      />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Date</th><th className="px-3 py-2">N°</th><th className="px-3 py-2">Journal</th>
              <th className="px-3 py-2">Libellé</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {entries.isLoading && <tr><td colSpan={6} className="px-3 py-6 text-muted-foreground">Chargement…</td></tr>}
            {entries.data?.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-muted-foreground">Aucune écriture.</td></tr>}
            {entries.data?.map((e) => {
              const t = entryTotals((e.skc_accounting_entry_lines ?? []).map((l) => ({ ...l, debit: +l.debit, credit: +l.credit })));
              return (
                <tr key={e.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setDetail(e)}>
                  <td className="num px-3 py-2">{e.entry_date}</td>
                  <td className="num px-3 py-2">{e.entry_number ?? "—"}</td>
                  <td className="px-3 py-2">{jrn.get(e.journal_id)?.code}</td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="num px-3 py-2 text-right">{formatEUR(t.debit)}</td>
                  <td className="px-3 py-2">
                    {e.status === "posted" ? <Badge>Validée</Badge> : e.status === "draft" ? <Badge variant="outline">Brouillon</Badge> : <Badge variant="secondary">Annulée</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewEntryDialog open={open} onClose={() => setOpen(false)} accounts={accounts.data ?? []} skc_journals={skc_journals.data ?? []} onSaved={refresh} />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="font-serif">{detail.description}</DialogTitle></DialogHeader>
              {detail.source_id && (detail.source_type === "skyvente" || detail.source_type === "skyachat") && (
                <Link to={detail.source_type === "skyvente" ? "/skyvente/documents/$id" : "/skyachat/documents/$id"} params={{ id: detail.source_id }}
                  className="text-sm font-medium text-primary hover:underline">
                  Voir la pièce source ({detail.source_type === "skyvente" ? "Sky Vente" : "Sky Achat"}) →
                </Link>
              )}
              <div className="text-sm text-muted-foreground">
                {detail.entry_date} · {jrn.get(detail.journal_id)?.name} · {detail.entry_number ?? "non numérotée"}
                {detail.reference ? ` · Réf. ${detail.reference}` : ""}
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th>Compte</th><th>Libellé</th><th className="text-right">Débit</th><th className="text-right">Crédit</th></tr></thead>
                <tbody>
                  {[...(detail.skc_accounting_entry_lines ?? [])].sort((a, b) => a.line_number - b.line_number).map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="num py-1">{acc.get(l.account_id)?.code} <span className="font-sans text-muted-foreground">{acc.get(l.account_id)?.name}</span></td>
                      <td>{l.label}</td>
                      <td className="num text-right">{+l.debit ? formatEUR(l.debit) : ""}</td>
                      <td className="num text-right">{+l.credit ? formatEUR(l.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {editable && (
                <div className="flex justify-end gap-2">
                  {detail.status === "draft" && (
                    <>
                      <Button variant="outline" onClick={() => confirm("Supprimer ce brouillon ?") && removeDraft.mutate(detail.id)}><Trash2 className="mr-1 h-4 w-4" />Supprimer</Button>
                      <Button onClick={() => post.mutate(detail)} disabled={post.isPending}><CheckCircle2 className="mr-1 h-4 w-4" />Valider</Button>
                    </>
                  )}
                  {detail.status === "posted" && (
                    <Button variant="outline" onClick={() => reverse.mutate(detail)} disabled={reverse.isPending}><Undo2 className="mr-1 h-4 w-4" />Extourner</Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewEntryDialog({ open, onClose, accounts, skc_journals, onSaved }: {
  open: boolean; onClose: () => void; accounts: Account[]; skc_journals: Journal[]; onSaved: () => void;
}) {
  const { data: ctx } = useCompany();
  const [journalId, setJournalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [busy, setBusy] = useState(false);
  const t = entryTotals(lines);
  const errors = validateEntry(lines);

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  async function save(postNow: boolean) {
    if (!journalId || !description) { toast.error("Journal et libellé requis."); return; }
    if (postNow && errors.length) { toast.error(errors.join(" ")); return; }
    setBusy(true);
    const id = crypto.randomUUID();
    const companyId = ctx!.company.id;
    const filled = lines.filter((l) => l.account_id && (l.debit > 0 || l.credit > 0));
    try {
      const { error } = await supabase.from("skc_accounting_entries").insert({
        id, company_id: companyId, journal_id: journalId, entry_date: date, reference: reference || null, description, status: "draft",
      });
      if (error) throw error;
      if (filled.length) {
        const { error: e2 } = await supabase.from("skc_accounting_entry_lines").insert(
          filled.map((l, i) => ({
            company_id: companyId, entry_id: id, line_number: i + 1, account_id: l.account_id,
            label: l.label || description, debit: l.debit || 0, credit: l.credit || 0,
          })),
        );
        if (e2) throw e2;
      }
      if (postNow) {
        const j = skc_journals.find((x) => x.id === journalId);
        const prefix = `${j?.code ?? "J"}-${date.slice(0, 4)}-`;
        const { count } = await supabase.from("skc_accounting_entries").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).eq("journal_id", journalId).like("entry_number", `${prefix}%`);
        const { error: e3 } = await supabase.from("skc_accounting_entries")
          .update({ status: "posted", entry_number: prefix + String((count ?? 0) + 1).padStart(4, "0") }).eq("id", id);
        if (e3) {
          toast.error(`Brouillon enregistré mais non validé : ${e3.message}`);
        } else toast.success("Écriture validée");
      } else toast.success("Brouillon enregistré");
      setLines([emptyLine(), emptyLine()]); setDescription(""); setReference("");
      onSaved(); onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif">Nouvelle écriture</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="grid gap-1"><Label>Journal</Label>
            <select className={selectCls} value={journalId} onChange={(e) => setJournalId(e.target.value)}>
              <option value="">—</option>{skc_journals.map((j) => <option key={j.id} value={j.id}>{j.code} {j.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Pièce / référence</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Libellé</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th>Compte</th><th>Libellé ligne</th><th className="w-32">Débit</th><th className="w-32">Crédit</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="pr-2 py-1">
                  <select className={selectCls} value={l.account_id} onChange={(e) => setLine(i, { account_id: e.target.value })}>
                    <option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                  </select>
                </td>
                <td className="pr-2"><Input value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} /></td>
                <td className="pr-2"><Input className="num text-right" type="number" step="0.01" min="0" value={l.debit || ""} onChange={(e) => setLine(i, { debit: +e.target.value, credit: 0 })} /></td>
                <td className="pr-2"><Input className="num text-right" type="number" step="0.01" min="0" value={l.credit || ""} onChange={(e) => setLine(i, { credit: +e.target.value, debit: 0 })} /></td>
                <td><Button size="icon" variant="ghost" aria-label="Retirer" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            <tr className="border-t border-border font-medium">
              <td><Button variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine()])}><Plus className="mr-1 h-4 w-4" />Ligne</Button></td>
              <td className="text-right pr-2 text-muted-foreground">Totaux</td>
              <td className="num text-right pr-2">{formatEUR(t.debit)}</td>
              <td className="num text-right pr-2">{formatEUR(t.credit)}</td><td />
            </tr>
          </tbody>
        </table>
        <div className={`text-sm ${t.delta === 0 && t.debit > 0 ? "text-success" : "text-destructive"}`}>
          {t.delta === 0 && t.debit > 0 ? "Écriture équilibrée." : `Écart : ${formatEUR(t.delta)}`}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>Enregistrer en brouillon</Button>
          <Button disabled={busy || errors.length > 0} onClick={() => save(true)}>Valider l'écriture</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
