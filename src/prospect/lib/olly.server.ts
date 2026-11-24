import { aiJson } from "./ai.server";
import type { GmailMessage } from "./google.server";

export const OLLY_EXPERTISE = `Tu es OLLY, agent commercial IA d'élite spécialisé en communication et vente B2B.
Ton expertise est construite sur: Comment se faire des amis (Carnegie), The Psychology of Selling (Tracy),
SPIN Selling (Rackham), The Challenger Sale (Dixon & Adamson), To Sell Is Human (Pink),
Never Split the Difference (Voss), Selling to Win (Denny), The Sales Acceleration Formula (Roberge),
L'art de convaincre sans manipuler (Bommelaer), The Little Red Book of Selling (Gitomer).

Principes non négociables:
- Parler du monde du prospect avant de parler de soi (Carnegie, Pink).
- Poser des questions Situation/Problème/Implication/Besoin plutôt qu'énumérer des features (SPIN).
- Apporter un insight qui recadre la situation du prospect (Challenger).
- Labelliser les émotions et utiliser des questions calibrées "Comment...?" (Voss).
- Une seule idée, un seul CTA à faible friction par email (Gitomer, Roberge).
- Jamais de flatterie creuse, jamais de promesse non autorisée, jamais d'information inventée.
- Français naturel, phrases courtes, zéro tournure robotique, zéro superlatif marketing.`;

export type AgentSettings = {
  agent_name: string;
  sender_name: string | null;
  sender_role: string | null;
  company_name: string | null;
  offer_description: string | null;
  value_proposition: string | null;
  target_persona: string | null;
  tone: string;
  language: string;
  email_length: string;
  cta_type: string;
  signature: string | null;
  meeting_slots: string | null;
  calendar_link: string | null;
  max_follow_ups: number;
  follow_up_delay_hours: number;
  check_interval_minutes: number;
  auto_reply: boolean;
  require_validation: boolean;
  model_analysis: string;
  model_research: string;
  model_writing: string;
  forbidden_claims: string | null;
};

export type CompanyRow = Record<string, unknown> & { name: string };

export type EmailDraft = {
  subject: string;
  body: string;
  strategy: {
    angle: string;
    hook: string;
    cta: string;
    qualification_goal: string;
    spin_question: string;
  };
  checks: {
    factual_ok: boolean;
    commercial_ok: boolean;
    quality_ok: boolean;
    issues: string[];
    facts_used: Array<{ fact: string; source?: string }>;
  };
};

function agentBrief(settings: AgentSettings) {
  return `PARAMÈTRES DE L'AGENT:
- Nom: ${settings.agent_name}
- Expéditeur: ${settings.sender_name ?? "non précisé"} (${settings.sender_role ?? "rôle non précisé"})
- Société: ${settings.company_name ?? "non précisée"}
- Offre: ${settings.offer_description ?? "non précisée"}
- Proposition de valeur: ${settings.value_proposition ?? "non précisée"}
- Persona cible: ${settings.target_persona ?? "non précisé"}
- Ton: ${settings.tone}
- Longueur souhaitée: ${settings.email_length}
- CTA: ${settings.cta_type}
- Signature: ${settings.signature ?? "(prénom + société)"}
- Créneaux disponibles: ${settings.meeting_slots ?? "non précisés"}
- Lien agenda: ${settings.calendar_link ?? "aucun"}
- Interdits: ${settings.forbidden_claims ?? "aucune promesse chiffrée non validée"}
- Langue: ${settings.language}`;
}

function companyBrief(company: CompanyRow) {
  const pick = (key: string) => JSON.stringify(company[key] ?? null);
  return `FICHE ENTREPRISE:
nom: ${company.name}
secteur: ${pick("sector")} / ${pick("subsector")}
ville: ${pick("city")} — région: ${pick("region")}
site: ${pick("website")}
description: ${pick("description")}
résumé IA: ${pick("ai_summary")}
compréhension du prospect: ${pick("prospect_understanding")}
signaux commerciaux: ${pick("signals")}
pourquoi contacter: ${pick("why_contact")}
angle d'approche: ${pick("approach_angle")}
décideurs: ${pick("decision_makers")}
score de pertinence: ${pick("relevance_score")} — ${pick("score_explanation")}
sources: ${pick("sources")}`;
}

export async function composeFirstEmail(
  settings: AgentSettings,
  company: CompanyRow,
): Promise<EmailDraft> {
  const fallback: EmailDraft = {
    subject: `Question rapide — ${company.name}`,
    body: "",
    strategy: { angle: "", hook: "", cta: settings.cta_type, qualification_goal: "", spin_question: "" },
    checks: { factual_ok: false, commercial_ok: false, quality_ok: false, issues: ["Génération incomplète"], facts_used: [] },
  };

  const draft = await aiJson<EmailDraft>({
    model: settings.model_writing,
    system: OLLY_EXPERTISE,
    prompt: `${agentBrief(settings)}

${companyBrief(company)}

Rédige le PREMIER email de prospection, entièrement personnalisé avec les éléments réels de la fiche.
Contraintes: objet < 60 caractères sans mot marketing; corps de 90 à 150 mots; une accroche ancrée dans
un fait vérifiable de la fiche; une question SPIN; un seul CTA à faible friction; signature.
Puis auto-contrôle avant envoi (factuel, commercial, qualité).

JSON attendu:
{
 "subject": "...",
 "body": "...",
 "strategy": {"angle","hook","cta","qualification_goal","spin_question"},
 "checks": {"factual_ok": true|false, "commercial_ok": true|false, "quality_ok": true|false,
            "issues": ["..."], "facts_used": [{"fact","source"}]}
}`,
    fallback,
  });

  if (!draft.body) return fallback;
  return draft;
}

export type ReplyAnalysis = {
  intent:
    | "INTERESTED" | "NOT_INTERESTED" | "QUESTION" | "REQUEST_INFORMATION" | "REQUEST_CALL"
    | "REQUEST_MEETING" | "OBJECTION" | "PRICE_REQUEST" | "NOT_RIGHT_PERSON" | "LATER"
    | "OUT_OF_OFFICE" | "UNSUBSCRIBE" | "BOUNCE" | "AUTOMATED_REPLY" | "UNCLEAR";
  sentiment: string;
  interest_score: number;
  objection: string | null;
  question: string | null;
  need: string | null;
  recommended_action: string;
  should_stop: boolean;
  stop_reason: string | null;
  pipeline_status: string;
  memory: {
    summary: string;
    facts: string[];
    needs: string[];
    objections: string[];
    questions: string[];
    commitments: string[];
    next_steps: string[];
    preferences: string[];
  };
};

export async function analyzeReply(
  settings: AgentSettings,
  company: CompanyRow,
  memory: Record<string, unknown>,
  thread: GmailMessage[],
): Promise<ReplyAnalysis> {
  const transcript = thread
    .map((message) => `--- ${message.date} | de: ${message.from}\nObjet: ${message.subject}\n${message.body}`)
    .join("\n");

  const fallback: ReplyAnalysis = {
    intent: "UNCLEAR",
    sentiment: "neutre",
    interest_score: 40,
    objection: null,
    question: null,
    need: null,
    recommended_action: "relancer avec une question ouverte",
    should_stop: false,
    stop_reason: null,
    pipeline_status: "REPLY_RECEIVED",
    memory: {
      summary: String(memory["summary"] ?? ""),
      facts: [], needs: [], objections: [], questions: [], commitments: [], next_steps: [], preferences: [],
    },
  };

  return aiJson<ReplyAnalysis>({
    model: settings.model_analysis,
    system: `${OLLY_EXPERTISE}\n\nTu analyses la dernière réponse d'un prospect et mets à jour la mémoire conversationnelle.`,
    prompt: `${companyBrief(company)}

MÉMOIRE ACTUELLE: ${JSON.stringify(memory)}

CONVERSATION COMPLÈTE:
${transcript}

Analyse UNIQUEMENT le dernier message reçu du prospect.
intent ∈ [INTERESTED, NOT_INTERESTED, QUESTION, REQUEST_INFORMATION, REQUEST_CALL, REQUEST_MEETING,
OBJECTION, PRICE_REQUEST, NOT_RIGHT_PERSON, LATER, OUT_OF_OFFICE, UNSUBSCRIBE, BOUNCE, AUTOMATED_REPLY, UNCLEAR]
pipeline_status ∈ [REPLY_RECEIVED, QUALIFICATION, INTERESTED, MEETING, WON, NOT_INTERESTED, UNSUBSCRIBED, UNREACHABLE, LATER, LOST]
should_stop=true si désabonnement, refus définitif, rendez-vous confirmé, adresse invalide, mauvais interlocuteur sans renvoi, ou report à une date lointaine.

JSON: {intent, sentiment, interest_score (0-100), objection, question, need, recommended_action,
should_stop, stop_reason, pipeline_status,
memory: {summary, facts[], needs[], objections[], questions[], commitments[], next_steps[], preferences[]}}`,
    fallback,
  });
}

export async function composeReply(
  settings: AgentSettings,
  company: CompanyRow,
  analysis: ReplyAnalysis,
  thread: GmailMessage[],
  availability?: string,
): Promise<EmailDraft> {
  const transcript = thread
    .slice(-6)
    .map((message) => `--- de: ${message.from}\n${message.body}`)
    .join("\n");

  const fallback: EmailDraft = {
    subject: thread[thread.length - 1]?.subject ?? `Re: ${company.name}`,
    body: "",
    strategy: { angle: "", hook: "", cta: settings.cta_type, qualification_goal: "", spin_question: "" },
    checks: { factual_ok: false, commercial_ok: false, quality_ok: false, issues: ["Génération incomplète"], facts_used: [] },
  };

  const draft = await aiJson<EmailDraft>({
    model: settings.model_writing,
    system: OLLY_EXPERTISE,
    prompt: `${agentBrief(settings)}

${companyBrief(company)}

ANALYSE DE LA DERNIÈRE RÉPONSE: ${JSON.stringify(analysis)}
DISPONIBILITÉS RÉELLES: ${availability ?? settings.meeting_slots ?? "non précisées"}

DERNIERS ÉCHANGES:
${transcript}

Rédige la réponse d'OLLY. Elle doit répondre précisément au dernier message reçu, faire progresser
la conversation (compréhension → qualification → intérêt → proposition → rendez-vous), traiter l'objection
en cherchant à comprendre avant de convaincre, et ne poser qu'UNE question. 60 à 130 mots.
Si le prospect demande un rendez-vous, propose deux créneaux précis issus des disponibilités.

Même JSON que pour le premier email (subject, body, strategy, checks).`,
    fallback,
  });

  if (!draft.body) return fallback;
  return draft;
}
