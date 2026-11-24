import { supabase } from "@/integrations/supabase/client";
import { sp } from "../types";
// Browser client typed loosely for sp_ tables.
export const spClient = sp(supabase);
