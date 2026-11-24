import { li, logStep } from "@/cml/lib/linkedin.server";

const AI = "https://ai.gateway.lovable.dev/v1";

async function ai(model: string, messages: any[], json = false) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const body: any = { model, messages };
  if (json) body.response_format = { type: "json_object" };
  const res = await fetch(`${AI}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

/** Importe les commentaires des posts publiés dans comment_drafts. */
export async function syncCommentsCore(supabase: any, userId: string) {
  const { data: posts } = await supabase
    .from("cml_posts").select("id, linkedin_urn, title, content")
    .eq("user_id", userId).eq("status", "published").not("linkedin_urn", "is", null).limit(30);

  let imported = 0;
  for (const p of posts ?? []) {
    try {
      const encoded = encodeURIComponent(p.linkedin_urn);
      const res = await li(`/v2/socialActions/${encoded}/comments?count=50`, { method: "GET" });
      for (const c of res?.elements ?? []) {
        const urn = c.$URN || c.id;
        const text = c?.message?.text ?? "";
        if (!urn || !text) continue;
        const { data: exists } = await supabase.from("cml_comment_drafts").select("id").eq("comment_urn", urn).limit(1);
        if (exists?.length) continue;
        await supabase.from("cml_comment_drafts").insert({
          user_id: userId, post_id: p.id, comment_urn: urn,
          author_name: c?.actor ?? null, comment_text: text, status: "pending",
        });
        imported++;
      }
    } catch (e: any) {
      await logStep(supabase, { user_id: userId, post_id: p.id, level: "warn", step: "comments", message: `Sync commentaires: ${e?.message ?? e}` });
    }
  }
  return { imported };
}

/** Génère des brouillons de réponse IA pour les commentaires en attente. */
export async function draftRepliesCore(supabase: any, userId: string, ids?: string[]) {
  const { data: s } = await supabase.from("cml_settings").select("*").eq("user_id", userId).maybeSingle();
  const model = s?.chat_model || "google/gemini-2.5-flash";

  let q = supabase.from("cml_comment_drafts").select("*, posts(content)").eq("user_id", userId).eq("status", "pending").limit(20);
  if (ids?.length) q = q.in("id", ids);
  const { data: rows } = await q;

  let drafted = 0;
  for (const r of rows ?? []) {
    try {
      const content = await ai(model, [
        {
          role: "system",
          content: `Tu réponds aux commentaires LinkedIn à la place de l'auteur du post.
Ton: ${s?.tone ?? "expert et chaleureux"}. Langue: ${s?.language ?? "fr"}. Voix de marque: ${s?.brand_voice ?? "authentique"}.
Règles: 1-3 phrases max, personnalisé, jamais générique, remercie brièvement puis apporte une valeur ou relance la conversation par une question. Pas de hashtags. Réponds uniquement par le texte de la réponse.`,
        },
        { role: "user", content: `Post:\n${(r.posts?.content ?? "").slice(0, 1200)}\n\nCommentaire de ${r.author_name ?? "un membre"}:\n${r.comment_text}` },
      ]);
      await supabase.from("cml_comment_drafts").update({ draft_reply: content.trim(), status: "drafted" }).eq("id", r.id);
      drafted++;
    } catch { /* ignore */ }
  }
  return { drafted };
}

/** Publie une réponse validée sur LinkedIn. */
export async function sendReplyCore(supabase: any, userId: string, id: string, text: string) {
  const { getMemberUrn } = await import("@/cml/lib/linkedin.server");
  const { data: row } = await supabase.from("cml_comment_drafts").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!row) throw new Error("Brouillon introuvable");
  const { data: post } = await supabase.from("cml_posts").select("linkedin_urn").eq("id", row.post_id).maybeSingle();
  if (!post?.linkedin_urn) throw new Error("Post source non publié");

  const urn = await getMemberUrn(supabase, userId);
  const encoded = encodeURIComponent(post.linkedin_urn);
  await li(`/v2/socialActions/${encoded}/comments`, {
    method: "POST",
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      actor: urn,
      object: post.linkedin_urn,
      message: { text },
      ...(row.comment_urn ? { parentComment: row.comment_urn } : {}),
    }),
  });
  await supabase.from("cml_comment_drafts").update({ draft_reply: text, status: "sent" }).eq("id", id);
  return { ok: true };
}
