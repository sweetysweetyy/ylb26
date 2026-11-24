import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
// bp_ tables are not in the generated types; this cast keeps queries scoped to the app's own tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bp = (c: unknown = supabase) => c as SupabaseClient<any, any, any>;
