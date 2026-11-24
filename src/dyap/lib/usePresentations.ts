import { useQuery } from "@tanstack/react-query";
import { supabase as sbase } from "@/integrations/supabase/client";
import { dy } from "@/dyap/lib/db";
const supabase = dy(sbase);
import { useAuth } from "@/hooks/useAuth";

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slide_data: any[];
  source_file_name: string | null;
  status: string;
  version: number;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export function usePresentations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["presentations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dyap_presentations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Presentation[];
    },
    enabled: !!user,
  });
}

export function usePresentation(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["presentation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dyap_presentations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Presentation;
    },
    enabled: !!user && !!id,
  });
}
