import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/odooweb/types";

export type OwClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ow = (c: any): OwClient => c as OwClient;
