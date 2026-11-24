import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/pageweaver/types";

export type PwClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pw = (c: any): PwClient => c as PwClient;
