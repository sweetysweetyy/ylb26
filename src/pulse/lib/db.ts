import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/pulse/types";

export type PlsClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pls = (c: any): PlsClient => c as PlsClient;
