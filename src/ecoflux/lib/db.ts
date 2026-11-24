import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/ecoflux/types";

export type EcoClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const eco = (c: any): EcoClient => c as EcoClient;
