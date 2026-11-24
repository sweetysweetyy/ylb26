/**
 * Cœur métier LinkedIn (server-only).
 * Utilisé par les server functions (client user-scoped) ET par le cron (service role).
 */

const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";

export function liHeaders() {
  const l = process.env.LOVABLE_API_KEY;
  const k = process.env.LINKEDIN_API_KEY;
  if (!l || !k) throw new Error("Connecteur LinkedIn indisponible. Reconnecte-le dans Paramètres.");
  return {
    Authorization: `Bearer ${l}`,
    "X-Connection-Api-Key": k,
  } as Record<string, string>;
}

export async function li(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...liHeaders(), "Content-Type": "application/json", ...((init.headers as any) || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${text.slice(0, 600)}`);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
}

export async function logStep(
  supabase: any,
  row: { user_id: string; post_id?: string | null; job_id?: string | null; level?: string; step?: string; message: string; detail?: any },
) {
  try {
    await supabase.from("cml_publish_logs").insert({
      user_id: row.user_id,
      post_id: row.post_id ?? null,
      job_id: row.job_id ?? null,
      level: row.level ?? "info",
      step: row.step ?? null,
      message: row.message.slice(0, 2000),
      detail: row.detail ?? {},
    });
  } catch {
    /* logging ne doit jamais casser le flux */
  }
}

/** Récupère (et met en cache) l'URN LinkedIn du membre. */
export async function getMemberUrn(supabase: any, userId: string): Promise<string> {
  const { data: s } = await supabase
    .from("cml_settings")
    .select("linkedin_profile")
    .eq("user_id", userId)
    .maybeSingle();
  const cached = (s?.linkedin_profile as any)?.urn;
  if (cached) return cached;

  const info = await li("/v2/userinfo", { method: "GET" });
  const urn = `urn:li:person:${info.sub}`;
  await supabase
    .from("cml_settings")
    .update({
      linkedin_connected: true,
      linkedin_profile: {
        ...((s?.linkedin_profile as any) || {}),
        sub: info.sub,
        urn,
        name: info.name,
        picture: info.picture,
        linked_at: new Date().toISOString(),
      },
    })
    .eq("user_id", userId);
  return urn;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error("Format d'image non supporté");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: m[1] };
}

/** Upload une image sur LinkedIn et retourne l'asset URN. */
export async function uploadImageAsset(imageUrl: string, ownerUrn: string): Promise<string> {
  let bytes: Uint8Array;
  let mime = "image/png";
  if (imageUrl.startsWith("data:")) {
    const r = dataUrlToBytes(imageUrl);
    bytes = r.bytes;
    mime = r.mime;
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Téléchargement image ${res.status}`);
    mime = res.headers.get("content-type") || "image/png";
    bytes = new Uint8Array(await res.arrayBuffer());
  }

  const reg = await li("/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: ownerUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [
          { identifier: "urn:li:userGeneratedContent", relationshipType: "OWNER" },
        ],
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
      },
    }),
  });

  const asset = reg?.value?.asset as string;
  const uploadUrl =
    reg?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!asset || !uploadUrl) throw new Error("registerUpload: réponse inattendue");

  // L'upload passe par la gateway (auth injectée) en réécrivant l'hôte LinkedIn.
  const u = new URL(uploadUrl);
  const proxied = `${GATEWAY}${u.pathname}${u.search}`;

  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const put = await fetch(proxied, {
    method: "PUT",
    headers: { ...liHeaders(), "Content-Type": mime },
    body: blob,
  });
  if (!put.ok) {
    // Fallback : upload direct (certaines uploadUrl sont pré-signées)
    const direct = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: blob });
    if (!direct.ok) throw new Error(`Upload image ${put.status}/${direct.status}`);
  }
  return asset;
}

export type PublishResult = { ok: true; linkedin_urn: string | null; withImage: boolean };

/** Publie un post (texte + image si présente) sur LinkedIn. Lève en cas d'échec. */
export async function publishPostCore(
  supabase: any,
  userId: string,
  postId: string,
  jobId?: string | null,
): Promise<PublishResult> {
  const { data: post } = await supabase
    .from("cml_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!post) throw new Error("Post introuvable");
  if (post.status === "published" && post.linkedin_urn) {
    return { ok: true, linkedin_urn: post.linkedin_urn, withImage: !!post.image_url };
  }

  const urn = await getMemberUrn(supabase, userId);
  await logStep(supabase, { user_id: userId, post_id: postId, job_id: jobId, step: "start", message: "Début de publication" });

  const commentary = [post.content ?? "", "", (post.hashtags ?? []).map((h: string) => `#${String(h).replace(/^#/, "")}`).join(" ")]
    .filter(Boolean)
    .join("\n")
    .trim();

  let media: any[] | null = null;
  let withImage = false;
  if (post.image_url) {
    try {
      const asset = await uploadImageAsset(post.image_url, urn);
      media = [
        {
          status: "READY",
          description: { text: (post.title ?? "").slice(0, 200) },
          media: asset,
          title: { text: (post.title ?? "Visuel").slice(0, 200) },
        },
      ];
      withImage = true;
      await logStep(supabase, { user_id: userId, post_id: postId, job_id: jobId, step: "image", message: "Image uploadée", detail: { asset } });
    } catch (e: any) {
      await logStep(supabase, {
        user_id: userId, post_id: postId, job_id: jobId, level: "warn", step: "image",
        message: `Upload image échoué, publication en texte seul: ${e?.message ?? e}`,
      });
    }
  }

  const body = {
    author: urn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: commentary },
        shareMediaCategory: media ? "IMAGE" : "NONE",
        ...(media ? { media } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...liHeaders(), "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    await logStep(supabase, {
      user_id: userId, post_id: postId, job_id: jobId, level: "error", step: "ugcPost",
      message: `Échec LinkedIn ${res.status}`, detail: { body: txt.slice(0, 1500) },
    });
    throw new Error(`LinkedIn ${res.status}: ${txt.slice(0, 500)}`);
  }
  let respJson: any = {};
  try { respJson = txt ? JSON.parse(txt) : {}; } catch { respJson = {}; }
  const linkedinUrn = respJson.id || res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || null;

  await supabase
    .from("cml_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      linkedin_urn: linkedinUrn,
      last_publish_error: null,
    })
    .eq("id", postId);

  await supabase.from("cml_notifications").insert({
    user_id: userId,
    kind: "publish_success",
    title: withImage ? "Post publié sur LinkedIn (avec visuel) ✨" : "Post publié sur LinkedIn ✨",
    body: (post.title ?? post.hook ?? "Ton post").slice(0, 140),
    meta: { post_id: postId, linkedin_urn: linkedinUrn, with_image: withImage },
  });

  await logStep(supabase, {
    user_id: userId, post_id: postId, job_id: jobId, level: "success", step: "done",
    message: "Publication réussie", detail: { linkedin_urn: linkedinUrn, with_image: withImage },
  });

  return { ok: true, linkedin_urn: linkedinUrn, withImage };
}

/** Récupère les métriques détaillées d'un post publié. */
export async function fetchPostMetrics(supabase: any, userId: string, post: any) {
  const encoded = encodeURIComponent(post.linkedin_urn);
  const stats: any = {
    likes: 0, comments: 0, shares: 0, impressions: 0, clicks: 0, engagement_rate: 0,
    fetched_at: new Date().toISOString(), sources: [] as string[],
  };

  try {
    const social = await li(`/v2/socialActions/${encoded}`, { method: "GET" });
    stats.likes = social?.likesSummary?.totalLikes ?? 0;
    stats.comments = social?.commentsSummary?.aggregatedTotalComments ?? social?.commentsSummary?.totalFirstLevelComments ?? 0;
    stats.sources.push("socialActions");
  } catch (e: any) {
    await logStep(supabase, { user_id: userId, post_id: post.id, level: "warn", step: "analytics", message: `socialActions: ${e?.message ?? e}` });
  }

  // Statistiques d'organisation / partages (vues + clics) quand l'API le permet
  try {
    const share = await li(`/v2/socialMetadata/${encoded}`, { method: "GET" });
    if (share?.reactionSummaries) {
      const total = Object.values(share.reactionSummaries).reduce((a: number, r: any) => a + (r?.count ?? 0), 0);
      if (total) stats.likes = total;
    }
    stats.sources.push("socialMetadata");
  } catch { /* optionnel */ }

  try {
    const ss = await li(
      `/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encoded}`,
      { method: "GET", headers: { "X-Restli-Protocol-Version": "2.0.0" } },
    );
    const el = ss?.elements?.[0]?.totalShareStatistics;
    if (el) {
      stats.impressions = el.impressionCount ?? 0;
      stats.clicks = el.clickCount ?? 0;
      stats.shares = el.shareCount ?? 0;
      stats.engagement_rate = el.engagement ? Math.round(el.engagement * 10000) / 100 : 0;
      stats.sources.push("shareStatistics");
    }
  } catch { /* non disponible pour les profils personnels */ }

  if (!stats.impressions) {
    // Estimation de repli : LinkedIn n'expose pas les impressions des profils perso.
    stats.impressions_estimated = Math.round((stats.likes * 32 + stats.comments * 75) * 1.15);
  }
  const base = stats.impressions || stats.impressions_estimated || 0;
  if (base && !stats.engagement_rate) {
    stats.engagement_rate = Math.round(((stats.likes + stats.comments + stats.shares) / base) * 10000) / 100;
  }

  await supabase.from("cml_posts").update({ analytics: stats }).eq("id", post.id);
  return stats;
}
