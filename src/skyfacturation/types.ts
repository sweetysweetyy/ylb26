/** Tables propres à Sky Facturation (préfixe sf_). */
export type SfLine = { name: string; quantity: number; unit_price: number; vat_rate: number; discount: number };
export type SfParty = {
  name: string; email: string; phone: string; address: string; zip: string; city: string;
  country: string; siret: string; vat_number: string;
};
export type SfPayload = {
  move_type: "out_invoice" | "out_refund" | "in_invoice" | "in_refund";
  reference: string; invoice_date: string; due_date: string | null;
  partner: SfParty; lines: SfLine[];
  total_ht: number; total_vat: number; total_ttc: number; notes: string;
};
export type SfStatus = "pending_review" | "synced_odoo" | "peppol_sent" | "peppol_delivered" | "imported" | "error" | "cancelled";
export type SfTransmission = {
  id: string; user_id: string; source_app: "skyvente" | "skyachat" | "odoo"; source_doc_id: string | null;
  source_doc_ref: string; direction: "outbound" | "inbound"; status: SfStatus;
  odoo_move_id: number | null; odoo_name: string | null; payload_preview: SfPayload;
  peppol_status: string | null; peppol_message_id: string | null; error_log: string | null;
  created_at: string; updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      sf_transmissions: { Row: SfTransmission; Insert: Partial<SfTransmission> & { user_id: string; source_app: string; direction: string }; Update: Partial<SfTransmission>; Relationships: [] };
      sf_settings: { Row: { id: string; user_id: string; auto_sync_peppol: boolean; require_siret_validation: boolean }; Insert: { user_id: string; auto_sync_peppol?: boolean; require_siret_validation?: boolean }; Update: { auto_sync_peppol?: boolean; require_siret_validation?: boolean }; Relationships: [] };
    };
    Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
  };
};
export const SF_STATUS_LABEL: Record<SfStatus, string> = {
  pending_review: "À vérifier", synced_odoo: "Créée dans Odoo", peppol_sent: "Envoyée (Peppol)",
  peppol_delivered: "Reçue par le destinataire", imported: "Importée dans Sky Achat", error: "Erreur", cancelled: "Annulée",
};
