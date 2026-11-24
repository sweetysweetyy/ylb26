import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/financierplan/types";

/** FinancierPlan tables (fp_*) are not in the shared generated types; this view types them. */
export type FpClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fp = (c: any): FpClient => c as FpClient;
export const fpSupabase = fp(supabase);
