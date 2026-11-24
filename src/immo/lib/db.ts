import { supabase } from "@/integrations/supabase/client";
// AtelierImmo tables (immo_*) are not in the shared generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const immoDb = supabase as any;
