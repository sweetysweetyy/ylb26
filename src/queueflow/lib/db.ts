import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/queueflow/types";

export type QfClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const qf = (c: any): QfClient => c as QfClient;
