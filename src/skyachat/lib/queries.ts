import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, type DocType, type Settings } from "./doc";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return data.user.id;
}

export const contactsQuery = queryOptions({
  queryKey: ["sa-contacts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("sa_contacts").select("*").order("company");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["sa-products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("sa_products").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["sa-settings"],
  queryFn: async (): Promise<Settings> => {
    const user_id = await uid();
    const { data, error } = await supabase.from("sa_settings").select("*").maybeSingle();
    if (error) throw error;
    return (data as Settings | null) ?? ({ ...DEFAULT_SETTINGS, user_id, created_at: "", updated_at: "" } as Settings);
  },
});

export const documentsQuery = (type?: DocType) =>
  queryOptions({
    queryKey: ["sa-documents", type ?? "all"],
    queryFn: async () => {
      let q = supabase.from("sa_documents").select("*").order("created_at", { ascending: false });
      if (type) q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const documentQuery = (id: string) =>
  queryOptions({
    queryKey: ["sa-document", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sa_documents").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

/** All documents of the same purchase chain (root + descendants). */
export const chainQuery = (rootId: string) =>
  queryOptions({
    queryKey: ["sa-chain", rootId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sa_documents")
        .select("id,type,number,status,root_id,source_id,created_at,items")
        .or(`id.eq.${rootId},root_id.eq.${rootId}`)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

export async function existingNumbers(type: DocType) {
  const { data } = await supabase.from("sa_documents").select("number").eq("type", type);
  return (data ?? []).map((d) => d.number);
}
