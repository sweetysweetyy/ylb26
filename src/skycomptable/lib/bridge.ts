// Passerelle Sky Vente / Sky Achat -> Sky Comptable. Lien souple : source_type + source_id
// sur l'écriture, accounting_entry_id sur la pièce. N'interrompt jamais la validation d'une facture.
import { supabase } from "./supabase";
import { round2 } from "./accounting";
import { createPostedEntry } from "./posting";
import type { GenLine } from "./invoicing";

export type BridgeSource = "skyvente" | "skyachat";
export type BridgeDoc = { id: string; type: string; number: string | null; issue_date: string; total_ht: number; total_vat: number; total_ttc: number; partner: string };
export type BridgeAccounts = { partner: string; main: string; vat: string };

const TABLE: Record<BridgeSource, string> = { skyvente: "sv_documents", skyachat: "sa_documents" };

/** Lignes d'écriture : vente = 411 D / 706 C / 44571 C ; achat = 606 D / 44566 D / 401 C ; un avoir inverse le sens. */
export function bridgeLines(source: BridgeSource, doc: BridgeDoc, acc: BridgeAccounts): GenLine[] {
  const ht = round2(Math.abs(Number(doc.total_ht) || 0));
  const vat = round2(Math.abs(Number(doc.total_vat) || 0));
  const ttc = round2(ht + vat);
  if (!(ttc > 0)) throw new Error("Montant nul : rien à comptabiliser.");
  const credit = doc.type === "credit_note";
  const partnerDebit = (source === "skyvente") !== credit;
  const label = `${doc.number ?? ""} ${doc.partner}`.trim();
  const s = (amount: number, debit: boolean) => (debit ? { debit: amount, credit: 0 } : { debit: 0, credit: amount });
  const out: GenLine[] = [{ account_id: acc.partner, label, ...s(ttc, partnerDebit) }];
  if (ht > 0) out.push({ account_id: acc.main, label, ...s(ht, !partnerDebit) });
  if (vat > 0) out.push({ account_id: acc.vat, label: `TVA ${label}`, ...s(vat, !partnerDebit) });
  return out;
}

/** Comptabilise une facture/avoir. Retourne le n° d'écriture, ou une raison si le paramétrage est incomplet. */
export async function postInvoiceToAccounting(source: BridgeSource, doc: BridgeDoc): Promise<{ ok: true; number: string } | { ok: false; reason: string }> {
  try {
    if (doc.type !== "invoice" && doc.type !== "credit_note") return { ok: false, reason: "Seules les factures et avoirs sont comptabilisés." };
    const { data: existing } = await supabase.from("skc_accounting_entries").select("id, entry_number")
      .eq("source_type", source).eq("source_id", doc.id).limit(1).maybeSingle();
    if (existing) {
      await supabase.from(TABLE[source]).update({ accounting_entry_id: existing.id }).eq("id", doc.id);
      return { ok: true, number: existing.entry_number ?? "" };
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { ok: false, reason: "Non connecté." };
    const { data: m } = await supabase.from("skc_company_memberships").select("company_id")
      .eq("user_id", u.user.id).eq("status", "active").limit(1).maybeSingle();
    if (!m) return { ok: false, reason: "Créez d'abord votre société dans Sky Comptable." };
    const companyId = m.company_id as string;
    const sale = source === "skyvente";
    const jCode = sale ? "VT" : "AC";
    const { data: j } = await supabase.from("skc_journals").select("id, code").eq("company_id", companyId).eq("code", jCode).maybeSingle();
    if (!j) return { ok: false, reason: `Journal ${jCode} introuvable dans Sky Comptable.` };
    const { data: accs } = await supabase.from("skc_chart_accounts").select("id, code").eq("company_id", companyId).eq("is_active", true);
    const find = (p: string) => (accs ?? []).sort((a, b) => a.code.localeCompare(b.code)).find((a) => a.code.startsWith(p))?.id;
    const acc = sale
      ? { partner: find("411"), main: find("706"), vat: find("44571") }
      : { partner: find("401"), main: find("606") ?? find("607"), vat: find("44566") };
    const missing = Object.entries(acc).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) return { ok: false, reason: `Comptes manquants dans le plan comptable (${sale ? "411 / 706 / 44571" : "401 / 606 / 44566"}).` };
    const lines = bridgeLines(source, doc, acc as BridgeAccounts);
    const r = await createPostedEntry({
      companyId, journalId: j.id, journalCode: j.code, date: doc.issue_date, reference: doc.number,
      description: `${doc.type === "credit_note" ? "Avoir" : "Facture"} ${doc.number ?? ""} — ${doc.partner}`.trim(),
      sourceType: source, sourceId: doc.id, lines,
    });
    await supabase.from(TABLE[source]).update({ accounting_entry_id: r.id }).eq("id", doc.id);
    return { ok: true, number: r.number };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/** Écriture liée à une pièce (pour le badge). */
export async function linkedEntry(source: BridgeSource, docId: string) {
  const { data } = await supabase.from("skc_accounting_entries").select("id, entry_number")
    .eq("source_type", source).eq("source_id", docId).limit(1).maybeSingle();
  return data as { id: string; entry_number: string | null } | null;
}

// ---- Règlements -> journal de banque (BQ) ----
export type PaymentDoc = { id: string; amount: number; date: string; invoiceNumber: string | null; partner: string; credit?: boolean };

/** Encaissement client = 512 D / 411 C ; paiement fournisseur = 401 D / 512 C ; un avoir inverse le sens. */
export function paymentLines(source: BridgeSource, p: PaymentDoc, acc: { bank: string; partner: string }): GenLine[] {
  const amount = round2(Math.abs(Number(p.amount) || 0));
  if (!(amount > 0)) throw new Error("Montant nul : rien à comptabiliser.");
  const moneyIn = (source === "skyvente") !== !!p.credit;
  const label = `Règlement ${p.invoiceNumber ?? ""} ${p.partner}`.replace(/\s+/g, " ").trim();
  return [
    { account_id: acc.bank, label, debit: moneyIn ? amount : 0, credit: moneyIn ? 0 : amount },
    { account_id: acc.partner, label, debit: moneyIn ? 0 : amount, credit: moneyIn ? amount : 0 },
  ];
}

/** Comptabilise un règlement au journal BQ. Ne bloque jamais l'enregistrement du paiement. */
export async function postPaymentToAccounting(source: BridgeSource, p: PaymentDoc): Promise<{ ok: true; number: string } | { ok: false; reason: string }> {
  try {
    const sourceType = `${source}_payment`;
    const { data: existing } = await supabase.from("skc_accounting_entries").select("entry_number")
      .eq("source_type", sourceType).eq("source_id", p.id).limit(1).maybeSingle();
    if (existing) return { ok: true, number: existing.entry_number ?? "" };
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { ok: false, reason: "Non connecté." };
    const { data: m } = await supabase.from("skc_company_memberships").select("company_id")
      .eq("user_id", u.user.id).eq("status", "active").limit(1).maybeSingle();
    if (!m) return { ok: false, reason: "Créez d'abord votre société dans Sky Comptable." };
    const companyId = m.company_id as string;
    const { data: j } = await supabase.from("skc_journals").select("id, code").eq("company_id", companyId).eq("code", "BQ").maybeSingle();
    if (!j) return { ok: false, reason: "Journal BQ introuvable dans Sky Comptable." };
    const { data: accs } = await supabase.from("skc_chart_accounts").select("id, code").eq("company_id", companyId).eq("is_active", true);
    const find = (pre: string) => (accs ?? []).sort((a, b) => a.code.localeCompare(b.code)).find((a) => a.code.startsWith(pre))?.id;
    const bank = find("512");
    const partner = find(source === "skyvente" ? "411" : "401");
    if (!bank || !partner) return { ok: false, reason: `Comptes manquants dans le plan comptable (512 / ${source === "skyvente" ? "411" : "401"}).` };
    const r = await createPostedEntry({
      companyId, journalId: j.id, journalCode: j.code, date: p.date, reference: p.invoiceNumber,
      description: `Règlement ${p.invoiceNumber ?? ""} — ${p.partner}`.trim(),
      sourceType, sourceId: p.id, lines: paymentLines(source, p, { bank, partner }),
    });
    return { ok: true, number: r.number };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
