import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/facturodoo/types";

export type FoClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fo = (c: any): FoClient => c as FoClient;
