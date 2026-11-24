import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// SkyVente uses the Laboratory's shared Supabase client; its tables are sv_-prefixed.
export function sb(): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}
