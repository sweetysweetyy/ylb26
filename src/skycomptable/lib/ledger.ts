import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useCompany } from "./session";

export type PostedLine = {
  id: string; account_id: string; label: string; debit: string; credit: string;
  skc_accounting_entries: { entry_date: string; entry_number: string | null; description: string; status: string };
};

/** Lignes des écritures validées uniquement. */
export function usePostedLines(from?: string, to?: string) {
  const { data } = useCompany();
  const companyId = data?.company.id;
  return useQuery({
    queryKey: ["ledger", companyId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("skc_accounting_entry_lines")
        .select("id, account_id, label, debit, credit, skc_accounting_entries!inner(entry_date, entry_number, description, status)")
        .eq("company_id", companyId!)
        .eq("skc_accounting_entries.status", "posted");
      if (from) q = q.gte("skc_accounting_entries.entry_date", from);
      if (to) q = q.lte("skc_accounting_entries.entry_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as PostedLine[]).sort((a, b) =>
        a.skc_accounting_entries.entry_date.localeCompare(b.skc_accounting_entries.entry_date),
      );
    },
  });
}
