import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/skyfacturation/types";

/** Client typé limité aux tables sf_* de Sky Facturation. */
export type SfClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sf = (c: any): SfClient => c as SfClient;
