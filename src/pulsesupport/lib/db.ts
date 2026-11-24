import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/pulsesupport/types";

export type PstClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pst = (c: any): PstClient => c as PstClient;
