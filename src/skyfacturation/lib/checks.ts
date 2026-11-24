import type { SfPayload } from "@/skyfacturation/types";

/** Contrôles des mentions requises avant transmission électronique. */
export function complianceIssues(p: SfPayload): string[] {
  const out: string[] = [];
  if (!p.partner.name.trim()) out.push("Nom du client / fournisseur manquant");
  const siret = p.partner.siret.replace(/\s/g, "");
  const fr = !p.partner.country || /^(fr|france)$/i.test(p.partner.country.trim());
  if (fr && !/^\d{14}$/.test(siret)) out.push("SIRET à 14 chiffres requis (identifiant Peppol 0009)");
  if (!p.partner.address.trim() || !p.partner.city.trim()) out.push("Adresse complète requise");
  if (!p.reference.trim()) out.push("Numéro de facture manquant (facture non validée ?)");
  if (p.lines.length === 0) out.push("Aucune ligne de facture");
  if (p.lines.some((l) => !l.name.trim())) out.push("Une ligne n'a pas de libellé");
  return out;
}
