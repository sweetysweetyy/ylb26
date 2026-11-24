import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/kooky/types";

export type KyClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ky = (c: any): KyClient => c as KyClient;
