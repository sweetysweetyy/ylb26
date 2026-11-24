// Création + validation d'une écriture générée (factures, paiements). Mêmes règles que la saisie manuelle.
import { supabase } from "./supabase";
import { validateEntry } from "./accounting";
import type { GenLine } from "./invoicing";

export async function createPostedEntry(p: {
  companyId: string; journalId: string; journalCode: string; date: string; description: string; reference?: string | null;
  sourceType: string; sourceId: string; lines: GenLine[];
}) {
  const errs = validateEntry(p.lines);
  if (errs.length) throw new Error(errs.join(" "));
  const id = crypto.randomUUID();
  const { error } = await supabase.from("skc_accounting_entries").insert({
    id, company_id: p.companyId, journal_id: p.journalId, entry_date: p.date, reference: p.reference ?? null,
    description: p.description, status: "draft", source_type: p.sourceType, source_id: p.sourceId,
  });
  if (error) throw error;
  const { error: e2 } = await supabase.from("skc_accounting_entry_lines").insert(
    p.lines.map((l, i) => ({
      company_id: p.companyId, entry_id: id, line_number: i + 1, account_id: l.account_id, label: l.label,
      debit: l.debit, credit: l.credit, contact_id: l.contact_id ?? null, tax_rate_id: l.tax_rate_id ?? null,
    })),
  );
  if (e2) { await supabase.from("skc_accounting_entries").delete().eq("id", id); throw e2; }
  const prefix = `${p.journalCode}-${p.date.slice(0, 4)}-`;
  const { count } = await supabase.from("skc_accounting_entries").select("id", { count: "exact", head: true })
    .eq("company_id", p.companyId).eq("journal_id", p.journalId).like("entry_number", `${prefix}%`);
  const number = prefix + String((count ?? 0) + 1).padStart(4, "0");
  const { error: e3 } = await supabase.from("skc_accounting_entries").update({ status: "posted", entry_number: number }).eq("id", id);
  if (e3) { await supabase.from("skc_accounting_entries").delete().eq("id", id); throw e3; }
  return { id, number };
}

/** Compte tiers par convention : 411* clients, 401* fournisseurs. */
export function partnerAccount(accounts: { id: string; code: string }[], customer: boolean) {
  const prefix = customer ? "411" : "401";
  const a = [...accounts].sort((x, y) => x.code.localeCompare(y.code)).find((x) => x.code.startsWith(prefix));
  if (!a) throw new Error(`Créez d'abord un compte ${prefix} dans le plan comptable.`);
  return a.id;
}
