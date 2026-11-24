import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type AnyRow = Record<string, any>;

async function fetchOne(table: string, userId: string) {
  const { data, error } = await (supabase.from as any)(table).select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as AnyRow | null;
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchOne("nxj_profiles", userId!),
  });
}

export function useSettings(userId?: string) {
  return useQuery({
    queryKey: ["settings", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchOne("nxj_settings", userId!),
  });
}

export function usePreferences(userId?: string) {
  return useQuery({
    queryKey: ["preferences", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchOne("nxj_preferences", userId!),
  });
}

export function useOffers(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("nxj-offers-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nxj_offers", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["offers", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["offers", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nxj_offers")
        .select("*")
        .eq("user_id", userId!)
        .order("score", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as AnyRow[];
    },
  });
}

export function useSearches(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("nxj-searches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nxj_searches", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["searches", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["searches", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nxj_searches")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AnyRow[];
    },
  });
}

export async function upsertRow(table: string, userId: string, patch: AnyRow) {
  const { error } = await (supabase.from as any)(table)
    .upsert({ user_id: userId, ...patch } as never, { onConflict: "user_id" });
  if (error) throw error;
}
