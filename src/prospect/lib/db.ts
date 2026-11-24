import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/prospect/types";

/** Prospect Engine tables (pe_*) are not in the shared generated types; this view types them. */
export type PeClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pe = (c: any): PeClient => c as PeClient;
export const peSupabase = pe(supabase);
