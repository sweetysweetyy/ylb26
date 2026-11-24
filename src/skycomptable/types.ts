export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      skc_accounting_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string | null
          id: string
          journal_id: string
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number?: string | null
          id?: string
          journal_id: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string | null
          id?: string
          journal_id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_journal_id_company_id_fkey"
            columns: ["journal_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_accounting_entry_lines: {
        Row: {
          account_id: string
          amount_currency: number | null
          company_id: string
          contact_id: string | null
          created_at: string
          credit: number
          currency_code: string
          debit: number
          entry_id: string
          id: string
          label: string
          lettered_at: string | null
          lettering_code: string | null
          line_number: number
          tax_rate_id: string | null
        }
        Insert: {
          account_id: string
          amount_currency?: number | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          credit?: number
          currency_code?: string
          debit?: number
          entry_id: string
          id?: string
          label: string
          lettered_at?: string | null
          lettering_code?: string | null
          line_number?: number
          tax_rate_id?: string | null
        }
        Update: {
          account_id?: string
          amount_currency?: number | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          credit?: number
          currency_code?: string
          debit?: number
          entry_id?: string
          id?: string
          label?: string
          lettered_at?: string | null
          lettering_code?: string | null
          line_number?: number
          tax_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entry_lines_account_id_company_id_fkey"
            columns: ["account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_contacts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_entry_id_company_id_fkey"
            columns: ["entry_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_tax_rate_id_company_id_fkey"
            columns: ["tax_rate_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_tax_rates"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_bank_accounts: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          currency_code: string
          display_name: string
          id: string
          is_active: boolean
          journal_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          currency_code?: string
          display_name: string
          id?: string
          is_active?: boolean
          journal_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          currency_code?: string
          display_name?: string
          id?: string
          is_active?: boolean
          journal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_company_id_fkey"
            columns: ["account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_journal_id_company_id_fkey"
            columns: ["journal_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at: string
          currency_code: string
          description: string
          external_transaction_id: string | null
          id: string
          imported_at: string
          matched_entry_line_id: string | null
          status: string
          transaction_date: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at?: string
          currency_code?: string
          description: string
          external_transaction_id?: string | null
          id?: string
          imported_at?: string
          matched_entry_line_id?: string | null
          status?: string
          transaction_date: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          company_id?: string
          created_at?: string
          currency_code?: string
          description?: string
          external_transaction_id?: string | null
          id?: string
          imported_at?: string
          matched_entry_line_id?: string | null
          status?: string
          transaction_date?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_company_id_fkey"
            columns: ["bank_account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_bank_accounts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_entry_line_id_company_id_fkey"
            columns: ["matched_entry_line_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entry_lines"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_chart_accounts: {
        Row: {
          account_type: string
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_reconcilable: boolean
          name: string
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_reconcilable?: boolean
          name: string
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_reconcilable?: boolean
          name?: string
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_accounts_parent_account_id_company_id_fkey"
            columns: ["parent_account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_companies: {
        Row: {
          country_code: string
          created_at: string
          created_by: string
          currency_code: string
          fiscal_year_start_month: number
          id: string
          instance_key: string
          legal_name: string | null
          name: string
          siret: string | null
          territory_code: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          created_by: string
          currency_code?: string
          fiscal_year_start_month?: number
          id?: string
          instance_key?: string
          legal_name?: string | null
          name: string
          siret?: string | null
          territory_code?: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          fiscal_year_start_month?: number
          id?: string
          instance_key?: string
          legal_name?: string | null
          name?: string
          siret?: string | null
          territory_code?: string
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      skc_company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      skc_contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          contact_type: string
          country_code: string | null
          created_at: string
          customer_code: string | null
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          is_customer: boolean
          is_supplier: boolean
          legal_name: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          supplier_code: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          contact_type?: string
          country_code?: string | null
          created_at?: string
          customer_code?: string | null
          display_name: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_customer?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          supplier_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          contact_type?: string
          country_code?: string | null
          created_at?: string
          customer_code?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_customer?: boolean
          is_supplier?: boolean
          legal_name?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          supplier_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      skc_fiscal_periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_locked: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_locked?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_locked?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      skc_invoice_documents: {
        Row: {
          accounting_entry_id: string | null
          company_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_type: string
          issue_date: string
          journal_id: string
          notes: string | null
          status: string
          subtotal: number
          supplier_reference: string | null
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          accounting_entry_id?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type: string
          issue_date: string
          journal_id: string
          notes?: string | null
          status?: string
          subtotal?: number
          supplier_reference?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          accounting_entry_id?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string
          issue_date?: string
          journal_id?: string
          notes?: string | null
          status?: string
          subtotal?: number
          supplier_reference?: string | null
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_documents_accounting_entry_id_company_id_fkey"
            columns: ["accounting_entry_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoice_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_contact_id_company_id_fkey"
            columns: ["contact_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_contacts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoice_documents_journal_id_company_id_fkey"
            columns: ["journal_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_invoice_lines: {
        Row: {
          account_id: string | null
          company_id: string
          created_at: string
          description: string
          discount_percent: number
          id: string
          invoice_id: string
          line_number: number
          line_subtotal: number
          line_tax: number
          quantity: number
          tax_rate_id: string | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          company_id: string
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          invoice_id: string
          line_number?: number
          line_subtotal?: number
          line_tax?: number
          quantity?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          company_id?: string
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id?: string
          line_number?: number
          line_subtotal?: number
          line_tax?: number
          quantity?: number
          tax_rate_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_company_id_fkey"
            columns: ["account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_company_id_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_invoice_documents"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "invoice_lines_tax_rate_id_company_id_fkey"
            columns: ["tax_rate_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_tax_rates"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_journals: {
        Row: {
          code: string
          company_id: string
          created_at: string
          currency_code: string
          default_account_id: string | null
          id: string
          is_active: boolean
          journal_type: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          currency_code?: string
          default_account_id?: string | null
          id?: string
          is_active?: boolean
          journal_type: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          currency_code?: string
          default_account_id?: string | null
          id?: string
          is_active?: boolean
          journal_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_default_account_id_company_id_fkey"
            columns: ["default_account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_payments: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          invoice_id: string
          payment_date: string
          payment_method: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accounting_entry_id?: string | null
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          invoice_id: string
          payment_date: string
          payment_method: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_method?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_accounting_entry_id_company_id_fkey"
            columns: ["accounting_entry_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_company_id_fkey"
            columns: ["invoice_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_invoice_documents"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      skc_tax_rates: {
        Row: {
          applies_to: string
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_price_included: boolean
          name: string
          rate_percent: number
          tax_account_id: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_price_included?: boolean
          name: string
          rate_percent: number
          tax_account_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_price_included?: boolean
          name?: string
          rate_percent?: number
          tax_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_tax_account_id_company_id_fkey"
            columns: ["tax_account_id", "company_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      skc_add_company_member: {
        Args: { p_company_id: string; p_email: string; p_role: string }
        Returns: undefined
      }
      skc_has_company_role: {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      skc_is_company_creator: { Args: { p_company_id: string }; Returns: boolean }
      skc_is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      skc_list_company_members: {
        Args: { p_company_id: string }
        Returns: {
          email: string
          membership_id: string
          role: string
          status: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
