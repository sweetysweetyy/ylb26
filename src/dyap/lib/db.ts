import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/dyap/types";

export type DyapClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dy = (c: any): DyapClient => c as DyapClient;
