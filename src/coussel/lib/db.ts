import { supabase } from "@/integrations/supabase/client";
import { csl as cast } from "../types";
// Browser client typed loosely for csl_ tables.
export const csl = cast(supabase);
