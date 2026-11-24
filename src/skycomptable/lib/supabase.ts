import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as shared } from "@/integrations/supabase/client";
import type { Database } from "../types";

/** Client typé sur les seules tables skc_ de SkyComptable (connexion partagée du Laboratoire). */
export const skc = () => shared as unknown as SupabaseClient<Database>;
// Le code importé était écrit pour un client non typé : on conserve ce comportement.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = shared as unknown as SupabaseClient<any>;
