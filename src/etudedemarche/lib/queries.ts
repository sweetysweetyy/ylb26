import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase as baseSupabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = baseSupabase as any;
import type { StudyRow } from "./study-types";

export type MethodologyRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
};

export type SettingsRow = {
  user_id: string;
  model: string;
  language: string;
  depth: string;
};

export function useStudies() {
  return useQuery({
    queryKey: ["studies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edm_studies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudyRow[];
    },
  });
}

export function useStudy(id: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["study", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("edm_studies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as StudyRow | null;
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "researching" || status === "analyzing" ? 3000 : false;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`study-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "edm_studies", filter: `id=eq.${id}` },
        (payload: { new: unknown }) => {
          queryClient.setQueryData(["study", id], payload.new as unknown as StudyRow);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return query;
}

export function useMethodologies() {
  return useQuery({
    queryKey: ["methodologies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edm_methodologies")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MethodologyRow[];
    },
  });
}

export function useSettings(userId?: string) {
  return useQuery({
    queryKey: ["settings", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edm_settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        user_id: userId!,
        model: "google/gemini-3.6-flash",
        language: "fr",
        depth: "standard",
      }) as unknown as SettingsRow;
    },
  });
}

export function useSaveSettings(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<SettingsRow>) => {
      const { error } = await supabase
        .from("edm_settings")
        .upsert({ user_id: userId!, ...values } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}