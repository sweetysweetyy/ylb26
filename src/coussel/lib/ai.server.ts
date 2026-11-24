const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquante");
  return key;
}

function friendlyError(status: number, message: string): Error {
  if (status === 429) return new Error("Trop de demandes d'un coup. Réessayez dans un instant.");
  if (status === 402)
    return new Error("Crédits IA épuisés. Rechargez les crédits de l'espace Lovable pour continuer.");
  if (status === 403) return new Error("L'IA est bloquée par les réglages de l'espace.");
  return new Error(message || `Erreur IA (${status})`);
}

/** Raisonnement, recherche d'idées et logique des carrousels — modèle choisi pour Coussel (défaut GPT 5.6 Sol). */
export async function reason<T>(model: string, system: string, user: string): Promise<T> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\nRéponds uniquement en JSON valide.` },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 300);
    try {
      message = (JSON.parse(text)?.error?.message as string) ?? message;
    } catch {
      /* garde le texte brut */
    }
    throw friendlyError(res.status, message);
  }

  const content = JSON.parse(text)?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Réponse IA vide");
  return JSON.parse(content) as T;
}

/** Génération du visuel manuscrit — GPT image 2. Renvoie du PNG base64. */
export async function drawSlide(prompt: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: "1024x1536",
      quality: "low",
      n: 1,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 300);
    try {
      message = (JSON.parse(text)?.error?.message as string) ?? message;
    } catch {
      /* garde le texte brut */
    }
    throw friendlyError(res.status, message);
  }

  const b64 = JSON.parse(text)?.data?.[0]?.b64_json;
  if (typeof b64 !== "string") throw new Error("Image non générée");
  return b64;
}
