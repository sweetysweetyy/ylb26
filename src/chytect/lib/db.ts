import { supabase } from "@/integrations/supabase/client";
// chyt_ tables are not in the generated types; cast keeps queries simple.
export const chyt = supabase as any;
