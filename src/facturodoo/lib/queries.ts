import { fo } from "@/facturodoo/lib/db";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const connectionQuery = queryOptions({
  queryKey: ["odoo_connection"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("odoo_connections")
      .select("url, db, username, modules, last_tested_at")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const invoicesQuery = queryOptions({
  queryKey: ["invoices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("fo_invoices")
      .select("id, file_name, status, extracted, odoo_move_name, odoo_purchase_name, odoo_partner_created, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});

export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await fo(supabase).from("fo_invoices").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

export const statusLabel: Record<string, { label: string; tone: string }> = {
  analyzing: { label: "Analyse en cours", tone: "bg-warning/20 text-warning-foreground" },
  review: { label: "À vérifier", tone: "bg-accent text-accent-foreground" },
  pushing: { label: "Envoi vers Odoo", tone: "bg-warning/20 text-warning-foreground" },
  created: { label: "Créée dans Odoo", tone: "bg-success/15 text-success" },
  error: { label: "Erreur", tone: "bg-destructive/10 text-destructive" },
};

export const fmtMoney = (n: number | null | undefined, cur?: string | null) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur || "EUR", maximumFractionDigits: 2 }).format(n);

export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
