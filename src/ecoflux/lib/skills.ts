import type { Workspace } from "./data";
import { meta } from "./data";
import type { PNode, Skill } from "./types";

export type SkillGuide = {
  thesis: string;
  waste: string;
  useWhen: string[];
  avoidWhen: string[];
  stack: string[];
  complexity: "Rapide" | "Modéré" | "Stratégique";
  delay: string;
};

export const SKILL_GUIDES: Record<string, SkillGuide> = {
  data: {
    thesis: "Une seule source de vérité : chaque information est saisie une fois, puis lue par tous les acteurs et outils.",
    waste: "Supprime les recherches, ressaisies et rapprochements entre fichiers, ERP et CRM.",
    useWhen: ["L'étape attend une information détenue par un autre outil", "Les mêmes données sont copiées dans plusieurs fichiers", "Des écarts de version provoquent des contrôles"],
    avoidWhen: ["La donnée n'existe nulle part sous forme exploitable", "Le volume est trop faible pour justifier un hub"],
    stack: ["Hub de données / base centrale", "Connecteurs API ERP & CRM", "Référentiel clients et articles"],
    complexity: "Stratégique",
    delay: "4 à 8 semaines",
  },
  ai_agents: {
    thesis: "Un agent cognitif traite les décisions répétitives (tri, contrôle, qualification) en continu, l'humain garde la validation des exceptions.",
    waste: "Supprime la latence d'arbitrage et la file d'attente devant un décideur humain.",
    useWhen: ["Décision basée sur des règles lisibles mais du contenu non structuré (mails, PDF)", "Contrôle ou qualification à fort volume", "Délai d'attente d'un valideur"],
    avoidWhen: ["Décision engageant une responsabilité légale sans supervision", "Absence d'historique ou de règles pour cadrer l'agent"],
    stack: ["LLM avec sortie structurée", "Garde-fous et seuils d'escalade humaine", "Journal d'audit des décisions"],
    complexity: "Modéré",
    delay: "2 à 6 semaines",
  },
  automation: {
    thesis: "Des règles déterministes déclenchées en temps réel exécutent les tâches mécaniques sans intervention.",
    waste: "Supprime les ressaisies, envois, relances et transferts manuels.",
    useWhen: ["Tâche courte, répétitive et sans jugement", "Déclencheur clair (formulaire, statut, réception)", "Transfert d'information entre deux outils"],
    avoidWhen: ["Règle instable ou cas particuliers fréquents", "Besoin d'interprétation : préférer un agent IA"],
    stack: ["Webhooks et déclencheurs", "Orchestrateur (n8n, Make)", "Modèles de mails et notifications"],
    complexity: "Rapide",
    delay: "1 à 3 semaines",
  },
  flow: {
    thesis: "Les passages de relais entre équipes sont synchronisés : chaque acteur reçoit le travail prêt, au bon moment.",
    waste: "Supprime les temps d'attente, ruptures de charge et allers-retours entre services.",
    useWhen: ["Attente longue entre deux étapes", "Passage de relais entre rôles différents", "Goulot d'étranglement identifié"],
    avoidWhen: ["Étape isolée sans dépendance amont ou aval"],
    stack: ["Statuts partagés et file de travail commune", "Alertes de relais et SLA", "Rituel court de synchronisation"],
    complexity: "Rapide",
    delay: "1 à 2 semaines",
  },
};

const num = (v: unknown) => Number(v) || 0;
const text = (n: PNode) => `${n.label} ${n.assigned_role ?? ""}`;

export function isApplied(cat: string, n: PNode, s?: Skill) {
  const src = String((meta(n) as Record<string, unknown>)["source"] ?? "");
  if (s && src.startsWith(s.name)) return true;
  if (cat === "ai_agents") return n.is_automated && (n.action_type === "decision" || /agent/i.test(n.assigned_role ?? ""));
  if (cat === "automation") return n.is_automated && !/agent/i.test(n.assigned_role ?? "");
  return false;
}

export function isOpportunity(cat: string, n: PNode) {
  if (n.is_automated) return false;
  const cyc = num(n.cycle_time_minutes), wait = num(n.wait_time_minutes), t = text(n);
  switch (cat) {
    case "data": return wait >= 30 || /saisi|recherch|consult|extra|export|import|donn|fichier|rapproch/i.test(t);
    case "ai_agents": return n.action_type === "decision" || /contr[ôo]l|valid|v[ée]rif|tri|analys|qualif/i.test(t);
    case "automation": return cyc <= 15 || /saisi|envo|relan|notif|copi|transf|mail|factur/i.test(t);
    default: return wait >= 60 || n.color_code === "waiting_time" || n.color_code === "bottleneck";
  }
}

/** Minutes and € saved per execution if the patch is applied to n. */
export function impact(n: PNode, patch: Partial<PNode>) {
  const before = { cyc: num(n.cycle_time_minutes), wait: num(n.wait_time_minutes), cost: num(n.hourly_cost) };
  const after = {
    cyc: patch.cycle_time_minutes ?? before.cyc,
    wait: patch.wait_time_minutes ?? before.wait,
    cost: patch.hourly_cost ?? before.cost,
  };
  const minutes = before.cyc + before.wait - (num(after.cyc) + num(after.wait));
  const euros = (before.cyc * before.cost - num(after.cyc) * num(after.cost)) / 60;
  return { before, after: { cyc: num(after.cyc), wait: num(after.wait), cost: num(after.cost) }, minutes, euros };
}

export function skillAudit(s: Skill, w: Workspace, patchFor: (cat: string, n: PNode) => Partial<PNode>) {
  const tb = w.nodes.filter((n) => n.is_to_be);
  const applied = tb.filter((n) => isApplied(s.category, n, s));
  const opportunities = tb.filter((n) => !applied.includes(n) && isOpportunity(s.category, n));
  const gains = opportunities.map((n) => impact(n, patchFor(s.category, n)));
  return {
    applied,
    opportunities,
    minutes: gains.reduce((a, g) => a + Math.max(0, g.minutes), 0),
    euros: gains.reduce((a, g) => a + Math.max(0, g.euros), 0),
  };
}
