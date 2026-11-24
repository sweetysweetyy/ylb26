import type { Block, DocLayout, DocType, Settings } from "./types";
import { sb } from "./supabase";

const baseBlocks = (withSig: boolean): Block[] => [
  { id: "header", visible: true, align: "left", spacing: 0 },
  { id: "parties", visible: true, spacing: 24 },
  { id: "meta", visible: true, spacing: 16 },
  { id: "intro", visible: true, spacing: 16 },
  { id: "items", visible: true, spacing: 16 },
  { id: "totals", visible: true, align: "right", spacing: 12 },
  { id: "notes", visible: true, spacing: 16 },
  { id: "terms", visible: true, spacing: 12 },
  { id: "signature", visible: withSig, spacing: 24 },
  { id: "custom", visible: false, spacing: 12, text: "" },
  { id: "footer", visible: true, align: "center", spacing: 28 },
];

const layout = (title: string, accent: string, extra: Partial<DocLayout>, sig: boolean): DocLayout => ({
  title,
  accent,
  text_color: "#1a1a2e",
  font: "Inter",
  font_size: 11,
  header_style: "band",
  table_style: "striped",
  show_logo: true,
  intro: "",
  terms: "",
  footer: "",
  validity_days: 30,
  blocks: baseBlocks(sig),
  ...extra,
});

export const DEFAULT_SETTINGS: Settings = {
  company: {
    name: "", legal_form: "", address: "", zip: "", city: "", country: "France",
    email: "", phone: "", website: "", siret: "", vat_number: "", rcs: "", capital: "",
    iban: "", bic: "", logo_url: "", vat_exempt: false, payment_terms_days: 30,
    late_penalty:
      "En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt légal sont exigibles de plein droit (art. L441-10 C. com.).",
    is_ei: false,
    early_discount: "Escompte pour paiement anticipé : néant.",
    insurance: "",
    mediator: "",
  },
  layouts: {
    quote: layout("DEVIS", "#5b6cff", {
      intro: "Suite à notre échange, veuillez trouver ci-dessous notre proposition.",
      terms: "Devis valable 30 jours. Bon pour accord : date et signature précédées de la mention « Bon pour accord ».",
    }, true),
    order: layout("BON DE COMMANDE", "#8b5cf6", {
      intro: "Bon de commande établi suite à l'acceptation du devis.",
      terms: "La commande est ferme et définitive à compter de sa signature.",
    }, true),
    invoice: layout("FACTURE", "#0ea5a4", {
      terms: "Paiement à réception par virement bancaire.",
    }, false),
    delivery: layout("PROCÈS-VERBAL DE LIVRAISON", "#f59e0b", {
      intro: "Le client atteste avoir reçu les prestations ci-dessous, conformes à la commande, et en prononce la réception.",
      terms: "Réception prononcée sans réserve, sauf mention contraire ci-dessus.",
    }, true),
    credit_note: layout("AVOIR", "#e11d48", {
      intro: "Avoir rectificatif annulant tout ou partie de la facture référencée.",
      terms: "Montant à déduire de la facture d'origine ou à rembourser.",
    }, false),
  },
};

export function mergeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const s = structuredClone(DEFAULT_SETTINGS);
  if (!raw) return s;
  s.company = { ...s.company, ...(raw.company || {}) };
  for (const t of Object.keys(s.layouts) as DocType[]) {
    const r = raw.layouts?.[t];
    if (r) s.layouts[t] = { ...s.layouts[t], ...r, blocks: r.blocks?.length ? r.blocks : s.layouts[t].blocks };
  }
  return s;
}

export async function loadSettings(): Promise<Settings> {
  const { data } = await sb().from("sv_settings").select("data").maybeSingle();
  return mergeSettings(data?.data as Partial<Settings>);
}

export async function saveSettings(s: Settings) {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) throw new Error("Non connecté");
  const { error } = await sb().from("sv_settings").upsert({ user_id: u.user.id, data: s });
  if (error) throw error;
}
