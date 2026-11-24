import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/caisse/types";

export type CvClient = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cv = (c: any): CvClient => c as CvClient;
