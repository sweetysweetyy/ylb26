import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

type Ctx = { session: Session | null; ready: boolean };
const SessionCtx = createContext<Ctx>({ session: null, ready: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ session: null, ready: false });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setState({ session, ready: true }));
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionCtx.Provider value={state}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

export type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  siret: string | null;
  vat_number: string | null;
  territory_code: string;
  currency_code: string;
  fiscal_year_start_month: number;
};
export type Membership = { company_id: string; role: "owner" | "accountant" | "viewer" };

/** Société active de l'utilisateur connecté (instance unique). */
export function useCompany() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["company", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data: m, error } = await supabase
        .from("skc_company_memberships")
        .select("company_id, role")
        .eq("user_id", session!.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!m) return null;
      const { data: c, error: e2 } = await supabase.from("skc_companies").select("*").eq("id", m.company_id).single();
      if (e2) throw e2;
      return { company: c as Company, role: (m as Membership).role };
    },
  });
}

export const canEdit = (role?: string) => role === "owner" || role === "accountant";
