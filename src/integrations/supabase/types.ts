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
      angelo_invoices_cache: {
        Row: {
          amount_residual: number
          amount_total: number
          currency: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          last_reminder_at: string | null
          last_reminder_level: number | null
          name: string
          odoo_id: number
          partner_email: string | null
          partner_id: number | null
          partner_name: string | null
          payment_state: string | null
          reminder_count: number
          sale_orders: string | null
          synced_at: string
          user_id: string
        }
        Insert: {
          amount_residual?: number
          amount_total?: number
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          last_reminder_at?: string | null
          last_reminder_level?: number | null
          name: string
          odoo_id: number
          partner_email?: string | null
          partner_id?: number | null
          partner_name?: string | null
          payment_state?: string | null
          reminder_count?: number
          sale_orders?: string | null
          synced_at?: string
          user_id?: string
        }
        Update: {
          amount_residual?: number
          amount_total?: number
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          last_reminder_at?: string | null
          last_reminder_level?: number | null
          name?: string
          odoo_id?: number
          partner_email?: string | null
          partner_id?: number | null
          partner_name?: string | null
          payment_state?: string | null
          reminder_count?: number
          sale_orders?: string | null
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      angelo_reminder_logs: {
        Row: {
          amount_residual: number | null
          body: string | null
          created_at: string
          days_overdue: number | null
          error: string | null
          id: string
          invoice_name: string | null
          invoice_odoo_id: number | null
          level: number | null
          partner_email: string | null
          partner_name: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          amount_residual?: number | null
          body?: string | null
          created_at?: string
          days_overdue?: number | null
          error?: string | null
          id?: string
          invoice_name?: string | null
          invoice_odoo_id?: number | null
          level?: number | null
          partner_email?: string | null
          partner_name?: string | null
          status: string
          subject?: string | null
          user_id?: string
        }
        Update: {
          amount_residual?: number | null
          body?: string | null
          created_at?: string
          days_overdue?: number | null
          error?: string | null
          id?: string
          invoice_name?: string | null
          invoice_odoo_id?: number | null
          level?: number | null
          partner_email?: string | null
          partner_name?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      angelo_reminder_rules: {
        Row: {
          active: boolean
          created_at: string
          days_overdue: number
          firmness: string
          id: string
          instructions: string
          level: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_overdue: number
          firmness?: string
          id?: string
          instructions?: string
          level: number
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days_overdue?: number
          firmness?: string
          id?: string
          instructions?: string
          level?: number
          user_id?: string
        }
        Relationships: []
      }
      angelo_run_logs: {
        Row: {
          finished_at: string | null
          id: string
          invoices_found: number
          message: string | null
          overdue_found: number
          reminders_sent: number
          started_at: string
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          invoices_found?: number
          message?: string | null
          overdue_found?: number
          reminders_sent?: number
          started_at?: string
          status?: string
          trigger?: string
          user_id?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          invoices_found?: number
          message?: string | null
          overdue_found?: number
          reminders_sent?: number
          started_at?: string
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      angelo_settings: {
        Row: {
          agent_name: string
          attach_pdf: boolean
          auto_send: boolean
          cc_emails: string
          company_name: string | null
          excluded_partners: string
          extra_instructions: string
          language: string
          legal_text: string
          min_amount: number
          min_days_between_reminders: number
          signature: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name?: string
          attach_pdf?: boolean
          auto_send?: boolean
          cc_emails?: string
          company_name?: string | null
          excluded_partners?: string
          extra_instructions?: string
          language?: string
          legal_text?: string
          min_amount?: number
          min_days_between_reminders?: number
          signature?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_name?: string
          attach_pdf?: boolean
          auto_send?: boolean
          cc_emails?: string
          company_name?: string | null
          excluded_partners?: string
          extra_instructions?: string
          language?: string
          legal_text?: string
          min_amount?: number
          min_days_between_reminders?: number
          signature?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aura_assistant_logs: {
        Row: {
          action_type: string
          app: string
          created_at: string
          detail: string
          id: string
          reply: string
          request: string
          sources: string[]
          status: string
          target: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          action_type?: string
          app?: string
          created_at?: string
          detail?: string
          id?: string
          reply?: string
          request?: string
          sources?: string[]
          status?: string
          target?: string | null
          user_id?: string
          value?: string | null
        }
        Update: {
          action_type?: string
          app?: string
          created_at?: string
          detail?: string
          id?: string
          reply?: string
          request?: string
          sources?: string[]
          status?: string
          target?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      aura_messages: {
        Row: {
          board: Json | null
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          board?: Json | null
          content: string
          created_at?: string
          id?: string
          role: string
          user_id?: string
        }
        Update: {
          board?: Json | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      bp_plans: {
        Row: {
          brand: Json
          content: Json
          created_at: string
          error_message: string | null
          id: string
          quality: Json
          source_filename: string | null
          source_path: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: Json
          content?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          quality?: Json
          source_filename?: string | null
          source_path?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: Json
          content?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          quality?: Json
          source_filename?: string | null
          source_path?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bp_settings: {
        Row: {
          created_at: string
          default_brand: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_brand?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_brand?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendsky_appointments: {
        Row: {
          buffer_min: number | null
          category: string | null
          client: string | null
          created_at: string | null
          end_at: string
          id: string
          location: string | null
          notes: string | null
          start_at: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          buffer_min?: number | null
          category?: string | null
          client?: string | null
          created_at?: string | null
          end_at: string
          id?: string
          location?: string | null
          notes?: string | null
          start_at: string
          status?: string | null
          title: string
          user_id?: string
        }
        Update: {
          buffer_min?: number | null
          category?: string | null
          client?: string | null
          created_at?: string | null
          end_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_at?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      calendsky_meetings: {
        Row: {
          actions: Json | null
          category: string | null
          created_at: string | null
          decisions: Json | null
          duration_min: number | null
          id: string
          meeting_date: string | null
          next_steps: Json | null
          participants: Json | null
          risks: Json | null
          score_clarity: number | null
          score_decision: number | null
          score_efficiency: number | null
          score_engagement: number | null
          score_global: number | null
          sentiment: string | null
          summary: string | null
          title: string
          topics: Json | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          actions?: Json | null
          category?: string | null
          created_at?: string | null
          decisions?: Json | null
          duration_min?: number | null
          id?: string
          meeting_date?: string | null
          next_steps?: Json | null
          participants?: Json | null
          risks?: Json | null
          score_clarity?: number | null
          score_decision?: number | null
          score_efficiency?: number | null
          score_engagement?: number | null
          score_global?: number | null
          sentiment?: string | null
          summary?: string | null
          title: string
          topics?: Json | null
          transcript?: string | null
          user_id?: string
        }
        Update: {
          actions?: Json | null
          category?: string | null
          created_at?: string | null
          decisions?: Json | null
          duration_min?: number | null
          id?: string
          meeting_date?: string | null
          next_steps?: Json | null
          participants?: Json | null
          risks?: Json | null
          score_clarity?: number | null
          score_decision?: number | null
          score_efficiency?: number | null
          score_engagement?: number | null
          score_global?: number | null
          sentiment?: string | null
          summary?: string | null
          title?: string
          topics?: Json | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendsky_planner_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string | null
          day: string | null
          done: boolean | null
          id: string
          kind: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string | null
          day?: string | null
          done?: boolean | null
          id?: string
          kind?: string | null
          user_id?: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string | null
          day?: string | null
          done?: boolean | null
          id?: string
          kind?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chyt_elements: {
        Row: {
          accent: string
          code: string
          color: string
          created_at: string
          d: number
          h: number
          id: string
          kind: string
          name: string
          note: string | null
          project_id: string
          rot: number
          user_id: string
          w: number
          x: number
          z: number
        }
        Insert: {
          accent?: string
          code?: string
          color?: string
          created_at?: string
          d?: number
          h?: number
          id?: string
          kind?: string
          name: string
          note?: string | null
          project_id: string
          rot?: number
          user_id?: string
          w?: number
          x?: number
          z?: number
        }
        Update: {
          accent?: string
          code?: string
          color?: string
          created_at?: string
          d?: number
          h?: number
          id?: string
          kind?: string
          name?: string
          note?: string | null
          project_id?: string
          rot?: number
          user_id?: string
          w?: number
          x?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "chyt_elements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chyt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chyt_projects: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_path: string | null
          room: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          photo_path?: string | null
          room?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_path?: string | null
          room?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chyt_renders: {
        Row: {
          created_at: string
          id: string
          path: string
          project_id: string
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          project_id: string
          prompt: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          project_id?: string
          prompt?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chyt_renders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chyt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_carousels: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          slides: Json
          theme: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          slides?: Json
          theme?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          slides?: Json
          theme?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cml_carousels_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cml_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_comment_drafts: {
        Row: {
          author_name: string | null
          comment_text: string
          comment_urn: string | null
          created_at: string
          draft_reply: string | null
          id: string
          post_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          comment_text: string
          comment_urn?: string | null
          created_at?: string
          draft_reply?: string | null
          id?: string
          post_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          comment_text?: string
          comment_urn?: string | null
          created_at?: string
          draft_reply?: string | null
          id?: string
          post_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cml_comment_drafts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cml_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_ideas: {
        Row: {
          angle: string | null
          created_at: string
          hook: string | null
          id: string
          rationale: string | null
          selected: boolean | null
          tags: string[] | null
          title: string
          trend_score: number | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          angle?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          rationale?: string | null
          selected?: boolean | null
          tags?: string[] | null
          title: string
          trend_score?: number | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          angle?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          rationale?: string | null
          selected?: boolean | null
          tags?: string[] | null
          title?: string
          trend_score?: number | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      cml_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          meta: Json | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cml_plans: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cml_posts: {
        Row: {
          analytics: Json | null
          carousel_id: string | null
          content: string
          created_at: string
          hashtags: string[] | null
          hook: string | null
          id: string
          idea_id: string | null
          image_config: Json | null
          image_prompt: string | null
          image_url: string | null
          last_publish_error: string | null
          linkedin_urn: string | null
          metadata: Json | null
          plan_id: string | null
          publish_attempts: number
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: Json | null
          carousel_id?: string | null
          content: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          idea_id?: string | null
          image_config?: Json | null
          image_prompt?: string | null
          image_url?: string | null
          last_publish_error?: string | null
          linkedin_urn?: string | null
          metadata?: Json | null
          plan_id?: string | null
          publish_attempts?: number
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: Json | null
          carousel_id?: string | null
          content?: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          idea_id?: string | null
          image_config?: Json | null
          image_prompt?: string | null
          image_url?: string | null
          last_publish_error?: string | null
          linkedin_urn?: string | null
          metadata?: Json | null
          plan_id?: string | null
          publish_attempts?: number
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cml_posts_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "cml_carousels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cml_posts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "cml_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cml_posts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cml_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_publish_jobs: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          post_id: string
          result: Json | null
          scheduled_for: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          post_id: string
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          post_id?: string
          result?: Json | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cml_publish_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cml_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_publish_logs: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          job_id: string | null
          level: string
          message: string
          post_id: string | null
          step: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          job_id?: string | null
          level?: string
          message: string
          post_id?: string | null
          step?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          post_id?: string | null
          step?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cml_publish_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cml_publish_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cml_publish_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cml_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cml_settings: {
        Row: {
          auto_publish: boolean | null
          best_slots: Json | null
          brand_voice: string | null
          chat_model: string | null
          content_pillars: string[] | null
          created_at: string
          goals: string | null
          ideas_model: string | null
          image_model: string | null
          industry: string | null
          keywords: string[] | null
          language: string | null
          linkedin_connected: boolean | null
          linkedin_profile: Json | null
          niche: string | null
          notify_email: boolean | null
          notify_inapp: boolean | null
          onboarded: boolean | null
          personal_bio: string | null
          post_structure_pref: Json | null
          posting_frequency: string | null
          target_audience: string | null
          timezone: string | null
          tone: string | null
          updated_at: string
          user_id: string
          writing_model: string | null
        }
        Insert: {
          auto_publish?: boolean | null
          best_slots?: Json | null
          brand_voice?: string | null
          chat_model?: string | null
          content_pillars?: string[] | null
          created_at?: string
          goals?: string | null
          ideas_model?: string | null
          image_model?: string | null
          industry?: string | null
          keywords?: string[] | null
          language?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile?: Json | null
          niche?: string | null
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          onboarded?: boolean | null
          personal_bio?: string | null
          post_structure_pref?: Json | null
          posting_frequency?: string | null
          target_audience?: string | null
          timezone?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
          writing_model?: string | null
        }
        Update: {
          auto_publish?: boolean | null
          best_slots?: Json | null
          brand_voice?: string | null
          chat_model?: string | null
          content_pillars?: string[] | null
          created_at?: string
          goals?: string | null
          ideas_model?: string | null
          image_model?: string | null
          industry?: string | null
          keywords?: string[] | null
          language?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile?: Json | null
          niche?: string | null
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          onboarded?: boolean | null
          personal_bio?: string | null
          post_structure_pref?: Json | null
          posting_frequency?: string | null
          target_audience?: string | null
          timezone?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          writing_model?: string | null
        }
        Relationships: []
      }
      cml_trends: {
        Row: {
          created_at: string
          id: string
          keywords: string[] | null
          published_at: string | null
          score: number
          source: string
          summary: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          published_at?: string | null
          score?: number
          source: string
          summary?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          published_at?: string | null
          score?: number
          source?: string
          summary?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          completed_at: string | null
          content: string | null
          created_at: string
          duration_minutes: number | null
          external_id: string | null
          external_url: string | null
          id: string
          location: string | null
          metadata: Json | null
          opportunity_id: string | null
          priority: string
          scheduled_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          priority?: string
          scheduled_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          priority?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: string
          opportunity_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
          opportunity_id?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
          opportunity_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_audit_logs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_closing_checklists: {
        Row: {
          category: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          opportunity_id: string
          order_index: number
          priority: string
          source: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id: string
          order_index?: number
          priority?: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string
          order_index?: number
          priority?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_closing_checklists_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          influence: string | null
          is_decision_maker: boolean | null
          name: string
          notes: string | null
          opportunity_id: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          influence?: string | null
          is_decision_maker?: boolean | null
          name: string
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          influence?: string | null
          is_decision_maker?: boolean | null
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notifications: {
        Row: {
          app: string
          body: string | null
          created_at: string
          href: string | null
          id: string
          opportunity_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          app?: string
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          opportunity_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id?: string
        }
        Update: {
          app?: string
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          opportunity_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notifications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          ai_summary: string | null
          closing_score: number | null
          company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          description: string | null
          doc_id: string | null
          doc_url: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          expected_close_date: string | null
          health_score: number | null
          id: string
          last_ai_analysis_at: string | null
          name: string
          next_actions: Json | null
          priority: string | null
          probability: number | null
          risks: Json | null
          sheet_id: string | null
          sheet_url: string | null
          stage: string
          strengths: Json | null
          tags: string[] | null
          tasks_list_id: string | null
          updated_at: string
          user_id: string
          value_amount: number | null
        }
        Insert: {
          ai_summary?: string | null
          closing_score?: number | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          doc_id?: string | null
          doc_url?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          expected_close_date?: string | null
          health_score?: number | null
          id?: string
          last_ai_analysis_at?: string | null
          name: string
          next_actions?: Json | null
          priority?: string | null
          probability?: number | null
          risks?: Json | null
          sheet_id?: string | null
          sheet_url?: string | null
          stage?: string
          strengths?: Json | null
          tags?: string[] | null
          tasks_list_id?: string | null
          updated_at?: string
          user_id?: string
          value_amount?: number | null
        }
        Update: {
          ai_summary?: string | null
          closing_score?: number | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          doc_id?: string | null
          doc_url?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          expected_close_date?: string | null
          health_score?: number | null
          id?: string
          last_ai_analysis_at?: string | null
          name?: string
          next_actions?: Json | null
          priority?: string | null
          probability?: number | null
          risks?: Json | null
          sheet_id?: string | null
          sheet_url?: string | null
          stage?: string
          strengths?: Json | null
          tags?: string[] | null
          tasks_list_id?: string | null
          updated_at?: string
          user_id?: string
          value_amount?: number | null
        }
        Relationships: []
      }
      crm_saved_insights: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      csl_carousels: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idea: string | null
          settings: Json
          sources: Json
          status: string
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idea?: string | null
          settings?: Json
          sources?: Json
          status?: string
          title?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idea?: string | null
          settings?: Json
          sources?: Json
          status?: string
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      csl_slides: {
        Row: {
          body: string | null
          carousel_id: string
          created_at: string
          headline: string | null
          id: string
          image_url: string | null
          position: number
          role: string | null
          status: string
          user_id: string
          visual_prompt: string | null
        }
        Insert: {
          body?: string | null
          carousel_id: string
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          position: number
          role?: string | null
          status?: string
          user_id: string
          visual_prompt?: string | null
        }
        Update: {
          body?: string | null
          carousel_id?: string
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          position?: number
          role?: string | null
          status?: string
          user_id?: string
          visual_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csl_slides_carousel_id_fkey"
            columns: ["carousel_id"]
            isOneToOne: false
            referencedRelation: "csl_carousels"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_messages: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cv_sales: {
        Row: {
          amount: number
          created_at: string
          customer_name: string | null
          id: string
          odoo_order_id: number | null
          product_name: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          odoo_order_id?: number | null
          product_name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          odoo_order_id?: number | null
          product_name?: string
          user_id?: string
        }
        Relationships: []
      }
      cv_session_state: {
        Row: {
          config_id: number | null
          session_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config_id?: number | null
          session_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config_id?: number | null
          session_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dyap_presentations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pdf_url: string | null
          slide_data: Json | null
          source_file_name: string | null
          source_file_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          slide_data?: Json | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          slide_data?: Json | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      dyap_settings: {
        Row: {
          analysis_level: string
          created_at: string
          custom_colors: Json | null
          id: string
          language: string
          theme: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_level?: string
          created_at?: string
          custom_colors?: Json | null
          id?: string
          language?: string
          theme?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_level?: string
          created_at?: string
          custom_colors?: Json | null
          id?: string
          language?: string
          theme?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eco_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          node_id: string | null
          process_id: string
          role: Database["public"]["Enums"]["eco_message_role"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          node_id?: string | null
          process_id: string
          role: Database["public"]["Enums"]["eco_message_role"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          node_id?: string | null
          process_id?: string
          role?: Database["public"]["Enums"]["eco_message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "eco_chat_messages_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_chat_messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_clarifications: {
        Row: {
          actors: Json
          cost_drivers: Json
          created_at: string
          id: string
          process_id: string
          rework_rate_percent: number
          tools: Json
          updated_at: string
        }
        Insert: {
          actors?: Json
          cost_drivers?: Json
          created_at?: string
          id?: string
          process_id: string
          rework_rate_percent?: number
          tools?: Json
          updated_at?: string
        }
        Update: {
          actors?: Json
          cost_drivers?: Json
          created_at?: string
          id?: string
          process_id?: string
          rework_rate_percent?: number
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_clarifications_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: true
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_clients: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eco_process_edges: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          is_to_be: boolean
          label: string | null
          process_id: string
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          is_to_be?: boolean
          label?: string | null
          process_id: string
          source_node_id: string
          target_node_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          is_to_be?: boolean
          label?: string | null
          process_id?: string
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_process_edges_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_process_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_process_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "eco_process_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_process_nodes: {
        Row: {
          action_type: Database["public"]["Enums"]["eco_action_type"]
          assigned_role: string | null
          color_code: Database["public"]["Enums"]["eco_color_code"]
          confidence_score: number
          created_at: string
          cycle_time_minutes: number
          hourly_cost: number
          id: string
          is_automated: boolean
          is_to_be: boolean
          label: string
          metadata: Json
          position_x: number
          position_y: number
          process_id: string
          updated_at: string
          wait_time_minutes: number
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["eco_action_type"]
          assigned_role?: string | null
          color_code?: Database["public"]["Enums"]["eco_color_code"]
          confidence_score?: number
          created_at?: string
          cycle_time_minutes?: number
          hourly_cost?: number
          id?: string
          is_automated?: boolean
          is_to_be?: boolean
          label: string
          metadata?: Json
          position_x?: number
          position_y?: number
          process_id: string
          updated_at?: string
          wait_time_minutes?: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["eco_action_type"]
          assigned_role?: string | null
          color_code?: Database["public"]["Enums"]["eco_color_code"]
          confidence_score?: number
          created_at?: string
          cycle_time_minutes?: number
          hourly_cost?: number
          id?: string
          is_automated?: boolean
          is_to_be?: boolean
          label?: string
          metadata?: Json
          position_x?: number
          position_y?: number
          process_id?: string
          updated_at?: string
          wait_time_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "eco_process_nodes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_process_skills: {
        Row: {
          impact_weight: number | null
          is_active: boolean
          process_id: string
          skill_id: string
        }
        Insert: {
          impact_weight?: number | null
          is_active?: boolean
          process_id: string
          skill_id: string
        }
        Update: {
          impact_weight?: number | null
          is_active?: boolean
          process_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_process_skills_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_process_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "eco_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_processes: {
        Row: {
          annual_volume: number
          client_id: string
          created_at: string
          currency: string
          department: string | null
          id: string
          lab_ecosystem: Json | null
          raw_input: string | null
          reference: string | null
          status: Database["public"]["Enums"]["eco_mission_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_volume?: number
          client_id: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          lab_ecosystem?: Json | null
          raw_input?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["eco_mission_status"]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          annual_volume?: number
          client_id?: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          lab_ecosystem?: Json | null
          raw_input?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["eco_mission_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "eco_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_round_up_solutions: {
        Row: {
          capacity_revenue_potential: number
          capacity_unlocked_hours_annual: number
          created_at: string
          cycle_time_reduction_percent: number
          decisions_traceability: Json
          executive_summary: string
          hard_cash_savings_annual: number
          id: string
          implementation_cost: number
          payback_days: number
          phases: Json
          process_id: string
          velocity_market_gain: string | null
        }
        Insert: {
          capacity_revenue_potential?: number
          capacity_unlocked_hours_annual?: number
          created_at?: string
          cycle_time_reduction_percent?: number
          decisions_traceability?: Json
          executive_summary?: string
          hard_cash_savings_annual?: number
          id?: string
          implementation_cost?: number
          payback_days?: number
          phases?: Json
          process_id: string
          velocity_market_gain?: string | null
        }
        Update: {
          capacity_revenue_potential?: number
          capacity_unlocked_hours_annual?: number
          created_at?: string
          cycle_time_reduction_percent?: number
          decisions_traceability?: Json
          executive_summary?: string
          hard_cash_savings_annual?: number
          id?: string
          implementation_cost?: number
          payback_days?: number
          phases?: Json
          process_id?: string
          velocity_market_gain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eco_round_up_solutions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "eco_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_skills: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      edm_methodologies: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          priority: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edm_settings: {
        Row: {
          created_at: string
          depth: string
          language: string
          model: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: string
          language?: string
          model?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: string
          language?: string
          model?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edm_studies: {
        Row: {
          analysis: Json | null
          brief: string
          created_at: string
          error: string | null
          id: string
          logs: Json
          model: string
          progress: number
          report: Json | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          brief: string
          created_at?: string
          error?: string | null
          id?: string
          logs?: Json
          model?: string
          progress?: number
          report?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          brief?: string
          created_at?: string
          error?: string | null
          id?: string
          logs?: Json
          model?: string
          progress?: number
          report?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_activity_log: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      fl_ai_conversations: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "fl_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      fl_candidate_duplicates: {
        Row: {
          candidate_id: string
          created_at: string
          duplicate_of: string
          id: string
          reasons: Json
          resolved: boolean
          similarity: number
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          duplicate_of: string
          id?: string
          reasons?: Json
          resolved?: boolean
          similarity?: number
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          duplicate_of?: string
          id?: string
          reasons?: Json
          resolved?: boolean
          similarity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_candidate_duplicates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "fl_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fl_candidate_duplicates_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "fl_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      fl_candidate_emails: {
        Row: {
          body: string
          candidate_id: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          kind: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          user_id: string
        }
        Insert: {
          body: string
          candidate_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          user_id: string
        }
        Update: {
          body?: string
          candidate_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_candidate_emails_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "fl_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fl_candidate_emails_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      fl_candidate_job_matches: {
        Row: {
          candidate_id: string
          created_at: string
          gaps: Json
          id: string
          job_id: string
          reasoning: string | null
          score: number
          score_breakdown: Json
          stage: string
          stage_notes: string | null
          stage_updated_at: string
          status: string
          strengths: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          gaps?: Json
          id?: string
          job_id: string
          reasoning?: string | null
          score?: number
          score_breakdown?: Json
          stage?: string
          stage_notes?: string | null
          stage_updated_at?: string
          status?: string
          strengths?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          gaps?: Json
          id?: string
          job_id?: string
          reasoning?: string | null
          score?: number
          score_breakdown?: Json
          stage?: string
          stage_notes?: string | null
          stage_updated_at?: string
          status?: string
          strengths?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_candidate_job_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "fl_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fl_candidate_job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      fl_candidates: {
        Row: {
          ai_analysis: Json
          available: boolean
          certifications: Json
          created_at: string
          desired_roles: Json
          educations: Json
          email: string | null
          experiences: Json
          full_name: string
          headline: string | null
          id: string
          languages: Json
          links: Json
          location: string | null
          phone: string | null
          rating: number | null
          raw_cv: string | null
          seniority: string | null
          skills: Json
          soft_skills: Json
          source: string
          source_ref: string | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          ai_analysis?: Json
          available?: boolean
          certifications?: Json
          created_at?: string
          desired_roles?: Json
          educations?: Json
          email?: string | null
          experiences?: Json
          full_name: string
          headline?: string | null
          id?: string
          languages?: Json
          links?: Json
          location?: string | null
          phone?: string | null
          rating?: number | null
          raw_cv?: string | null
          seniority?: string | null
          skills?: Json
          soft_skills?: Json
          source?: string
          source_ref?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          ai_analysis?: Json
          available?: boolean
          certifications?: Json
          created_at?: string
          desired_roles?: Json
          educations?: Json
          email?: string | null
          experiences?: Json
          full_name?: string
          headline?: string | null
          id?: string
          languages?: Json
          links?: Json
          location?: string | null
          phone?: string | null
          rating?: number | null
          raw_cv?: string | null
          seniority?: string | null
          skills?: Json
          soft_skills?: Json
          source?: string
          source_ref?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      fl_cron_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          items_found: number
          items_processed: number
          items_skipped: number
          kind: string
          logs: Json
          started_at: string
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number
          items_processed?: number
          items_skipped?: number
          kind: string
          logs?: Json
          started_at?: string
          status?: string
          trigger?: string
          user_id: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          items_found?: number
          items_processed?: number
          items_skipped?: number
          kind?: string
          logs?: Json
          started_at?: string
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_google_connections: {
        Row: {
          access_token: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_interview_scorecards: {
        Row: {
          candidate_id: string
          created_at: string
          criteria: Json
          id: string
          job_id: string | null
          notes: string | null
          overall_score: number | null
          recommendation: string | null
          reviewer_name: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          criteria?: Json
          id?: string
          job_id?: string | null
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          reviewer_name?: string
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          criteria?: Json
          id?: string
          job_id?: string | null
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          reviewer_name?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_interview_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "fl_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fl_interview_scorecards_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "fl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      fl_jobs: {
        Row: {
          accepts_applications: boolean
          ai_analysis: Json
          benefits: Json
          company: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          id: string
          interview_kit: Json
          languages: Json
          location: string | null
          nice_to_have: Json
          priority: number
          raw_input: string | null
          required_skills: Json
          requirements: Json
          responsibilities: Json
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          source: string
          source_ref: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepts_applications?: boolean
          ai_analysis?: Json
          benefits?: Json
          company?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          interview_kit?: Json
          languages?: Json
          location?: string | null
          nice_to_have?: Json
          priority?: number
          raw_input?: string | null
          required_skills?: Json
          requirements?: Json
          responsibilities?: Json
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string
          source_ref?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepts_applications?: boolean
          ai_analysis?: Json
          benefits?: Json
          company?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          interview_kit?: Json
          languages?: Json
          location?: string | null
          nice_to_have?: Json
          priority?: number
          raw_input?: string | null
          required_skills?: Json
          requirements?: Json
          responsibilities?: Json
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          source?: string
          source_ref?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          link: string | null
          metadata: Json
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_processed_emails: {
        Row: {
          message_id: string
          processed_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          processed_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          processed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_processed_sheet_rows: {
        Row: {
          processed_at: string
          row_hash: string
          row_index: number | null
          spreadsheet_id: string
          user_id: string
        }
        Insert: {
          processed_at?: string
          row_hash: string
          row_index?: number | null
          spreadsheet_id: string
          user_id: string
        }
        Update: {
          processed_at?: string
          row_hash?: string
          row_index?: number | null
          spreadsheet_id?: string
          user_id?: string
        }
        Relationships: []
      }
      fl_settings: {
        Row: {
          ai_model: string
          alert_score_threshold: number
          auto_alerts_enabled: boolean
          auto_candidate_emails: boolean
          auto_match: boolean
          auto_sync: boolean
          created_at: string
          email_provider: string | null
          gmail_cron_enabled: boolean
          gmail_interval_minutes: number
          gmail_keywords: string
          gmail_last_run_at: string | null
          gmail_max_per_run: number
          gmail_require_attachment: boolean
          gmail_search_query: string
          sender_signature: string | null
          sheets_cron_enabled: boolean
          sheets_interval_minutes: number
          sheets_last_run_at: string | null
          sheets_max_per_run: number
          sheets_range: string
          sheets_spreadsheet_id: string | null
          skytab_sheet_id: string | null
          spreadsheet_provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          alert_score_threshold?: number
          auto_alerts_enabled?: boolean
          auto_candidate_emails?: boolean
          auto_match?: boolean
          auto_sync?: boolean
          created_at?: string
          email_provider?: string | null
          gmail_cron_enabled?: boolean
          gmail_interval_minutes?: number
          gmail_keywords?: string
          gmail_last_run_at?: string | null
          gmail_max_per_run?: number
          gmail_require_attachment?: boolean
          gmail_search_query?: string
          sender_signature?: string | null
          sheets_cron_enabled?: boolean
          sheets_interval_minutes?: number
          sheets_last_run_at?: string | null
          sheets_max_per_run?: number
          sheets_range?: string
          sheets_spreadsheet_id?: string | null
          skytab_sheet_id?: string | null
          spreadsheet_provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          alert_score_threshold?: number
          auto_alerts_enabled?: boolean
          auto_candidate_emails?: boolean
          auto_match?: boolean
          auto_sync?: boolean
          created_at?: string
          email_provider?: string | null
          gmail_cron_enabled?: boolean
          gmail_interval_minutes?: number
          gmail_keywords?: string
          gmail_last_run_at?: string | null
          gmail_max_per_run?: number
          gmail_require_attachment?: boolean
          gmail_search_query?: string
          sender_signature?: string | null
          sheets_cron_enabled?: boolean
          sheets_interval_minutes?: number
          sheets_last_run_at?: string | null
          sheets_max_per_run?: number
          sheets_range?: string
          sheets_spreadsheet_id?: string | null
          skytab_sheet_id?: string | null
          spreadsheet_provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fl_settings_skytab_sheet_id_fkey"
            columns: ["skytab_sheet_id"]
            isOneToOne: false
            referencedRelation: "skytab_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      fo_invoices: {
        Row: {
          created_at: string
          error_message: string | null
          extracted: Json | null
          file_name: string
          id: string
          odoo_move_id: number | null
          odoo_move_name: string | null
          odoo_partner_created: boolean
          odoo_partner_id: number | null
          odoo_purchase_id: number | null
          odoo_purchase_name: string | null
          status: string
          storage_path: string
          supplier_match: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted?: Json | null
          file_name: string
          id?: string
          odoo_move_id?: number | null
          odoo_move_name?: string | null
          odoo_partner_created?: boolean
          odoo_partner_id?: number | null
          odoo_purchase_id?: number | null
          odoo_purchase_name?: string | null
          status?: string
          storage_path?: string
          supplier_match?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted?: Json | null
          file_name?: string
          id?: string
          odoo_move_id?: number | null
          odoo_move_name?: string | null
          odoo_partner_created?: boolean
          odoo_partner_id?: number | null
          odoo_purchase_id?: number | null
          odoo_purchase_name?: string | null
          status?: string
          storage_path?: string
          supplier_match?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fp_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          role: string
          section_key: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          role: string
          section_key?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          section_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fp_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fp_plan_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          project_id: string
          section_key: string
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          project_id: string
          section_key: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          project_id?: string
          section_key?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fp_plan_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "fp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fp_projects: {
        Row: {
          created_at: string
          currency: string
          id: string
          idea: string
          legal_form: string | null
          location: string | null
          name: string
          progress: number
          sector: string | null
          starting_capital: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          idea?: string
          legal_form?: string | null
          location?: string | null
          name: string
          progress?: number
          sector?: string | null
          starting_capital?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          idea?: string
          legal_form?: string | null
          location?: string | null
          name?: string
          progress?: number
          sector?: string | null
          starting_capital?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fp_settings: {
        Row: {
          ai_model: string
          created_at: string
          currency: string
          language: string
          tax_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          created_at?: string
          currency?: string
          language?: string
          tax_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          currency?: string
          language?: string
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          refresh_token: string
          scope: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          created_at: string
          description: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      immo_properties: {
        Row: {
          ai_analysis: Json
          bedrooms: number
          city: string
          condition: string
          created_at: string
          description: string
          highlights: Json
          id: string
          photos: string[]
          price: number
          property_type: string
          published: boolean
          rooms: number
          surface: number
          title: string
          transaction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json
          bedrooms?: number
          city?: string
          condition?: string
          created_at?: string
          description?: string
          highlights?: Json
          id?: string
          photos?: string[]
          price?: number
          property_type?: string
          published?: boolean
          rooms?: number
          surface?: number
          title?: string
          transaction?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json
          bedrooms?: number
          city?: string
          condition?: string
          created_at?: string
          description?: string
          highlights?: Json
          id?: string
          photos?: string[]
          price?: number
          property_type?: string
          published?: boolean
          rooms?: number
          surface?: number
          title?: string
          transaction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ky_lead_searches: {
        Row: {
          brief: string | null
          created_at: string
          error: string | null
          id: string
          location: string | null
          sector: string
          status: string
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: string | null
          created_at?: string
          error?: string | null
          id?: string
          location?: string | null
          sector: string
          status?: string
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          brief?: string | null
          created_at?: string
          error?: string | null
          id?: string
          location?: string | null
          sector?: string
          status?: string
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ky_leads: {
        Row: {
          analysis: string | null
          approach: string | null
          city: string | null
          company_name: string
          company_size: string | null
          contacts: Json
          country: string | null
          created_at: string
          email: string | null
          error: string | null
          id: string
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          phone: string | null
          position: number
          score: number | null
          search_id: string
          sector: string | null
          sources: Json
          status: string
          street: string | null
          summary: string | null
          updated_at: string
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          analysis?: string | null
          approach?: string | null
          city?: string | null
          company_name: string
          company_size?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          phone?: string | null
          position?: number
          score?: number | null
          search_id: string
          sector?: string | null
          sources?: Json
          status?: string
          street?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          analysis?: string | null
          approach?: string | null
          city?: string | null
          company_name?: string
          company_size?: string | null
          contacts?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          error?: string | null
          id?: string
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          phone?: string | null
          position?: number
          score?: number | null
          search_id?: string
          sector?: string | null
          sources?: Json
          status?: string
          street?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ky_leads_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "ky_lead_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_activity: {
        Row: {
          app_key: string | null
          created_at: string
          id: string
          kind: string
          seconds_saved: number
          user_id: string
        }
        Insert: {
          app_key?: string | null
          created_at?: string
          id?: string
          kind: string
          seconds_saved?: number
          user_id?: string
        }
        Update: {
          app_key?: string | null
          created_at?: string
          id?: string
          kind?: string
          seconds_saved?: number
          user_id?: string
        }
        Relationships: []
      }
      mm_agent_actions_log: {
        Row: {
          args: Json | null
          attempt: number
          created_at: string
          error_detail: string | null
          id: string
          plan: Json | null
          result: Json | null
          source: string
          stage: string
          status: string
          task_id: string | null
          tool_name: string
          user_id: string
          verification_url: string | null
        }
        Insert: {
          args?: Json | null
          attempt?: number
          created_at?: string
          error_detail?: string | null
          id?: string
          plan?: Json | null
          result?: Json | null
          source: string
          stage: string
          status: string
          task_id?: string | null
          tool_name: string
          user_id?: string
          verification_url?: string | null
        }
        Update: {
          args?: Json | null
          attempt?: number
          created_at?: string
          error_detail?: string | null
          id?: string
          plan?: Json | null
          result?: Json | null
          source?: string
          stage?: string
          status?: string
          task_id?: string | null
          tool_name?: string
          user_id?: string
          verification_url?: string | null
        }
        Relationships: []
      }
      mm_agent_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mm_agent_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          user_id?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mm_agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "mm_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_agent_tools: {
        Row: {
          body_template: string | null
          created_at: string
          description: string
          enabled: boolean
          headers: Json
          http_method: string
          id: string
          input_schema: Json
          name: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          body_template?: string | null
          created_at?: string
          description?: string
          enabled?: boolean
          headers?: Json
          http_method?: string
          id?: string
          input_schema?: Json
          name: string
          updated_at?: string
          url: string
          user_id?: string
        }
        Update: {
          body_template?: string | null
          created_at?: string
          description?: string
          enabled?: boolean
          headers?: Json
          http_method?: string
          id?: string
          input_schema?: Json
          name?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      mm_agents: {
        Row: {
          automation_id: string
          created_at: string
          id: string
          instructions: string
          model: string
          name: string
          order: number
          role: string | null
          services: string[]
          tools: Json
        }
        Insert: {
          automation_id: string
          created_at?: string
          id?: string
          instructions?: string
          model?: string
          name: string
          order?: number
          role?: string | null
          services?: string[]
          tools?: Json
        }
        Update: {
          automation_id?: string
          created_at?: string
          id?: string
          instructions?: string
          model?: string
          name?: string
          order?: number
          role?: string | null
          services?: string[]
          tools?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mm_agents_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mm_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_automations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          model: string
          name: string
          prompt: string | null
          state: Json
          status: Database["public"]["Enums"]["automation_status"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name: string
          prompt?: string | null
          state?: Json
          status?: Database["public"]["Enums"]["automation_status"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name?: string
          prompt?: string | null
          state?: Json
          status?: Database["public"]["Enums"]["automation_status"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mm_cron_logs: {
        Row: {
          created_at: string
          duration_ms: number
          frequency: string | null
          id: string
          invoices_found: number
          overdue_found: number
          reason: string | null
          reminders_sent: number
          status: string
          trigger: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          frequency?: string | null
          id?: string
          invoices_found?: number
          overdue_found?: number
          reason?: string | null
          reminders_sent?: number
          status: string
          trigger: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          frequency?: string | null
          id?: string
          invoices_found?: number
          overdue_found?: number
          reason?: string | null
          reminders_sent?: number
          status?: string
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      mm_cron_tokens: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      mm_debug_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          payload: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          payload?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          payload?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mm_debug_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mm_debug_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_debug_sessions: {
        Row: {
          attempts: Json
          automation_id: string
          created_at: string
          ended_at: string | null
          id: string
          issue: string
          plan: Json | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: Json
          automation_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          issue: string
          plan?: Json | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attempts?: Json
          automation_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          issue?: string
          plan?: Json | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mm_debug_sessions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mm_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_execution_actions: {
        Row: {
          agent_name: string | null
          attempts: number | null
          duration_ms: number | null
          error: string | null
          execution_id: string
          finished_at: string | null
          id: string
          input: Json | null
          label: string
          output: Json | null
          started_at: string
          status: string
          tool: string | null
        }
        Insert: {
          agent_name?: string | null
          attempts?: number | null
          duration_ms?: number | null
          error?: string | null
          execution_id: string
          finished_at?: string | null
          id?: string
          input?: Json | null
          label: string
          output?: Json | null
          started_at?: string
          status?: string
          tool?: string | null
        }
        Update: {
          agent_name?: string | null
          attempts?: number | null
          duration_ms?: number | null
          error?: string | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          input?: Json | null
          label?: string
          output?: Json | null
          started_at?: string
          status?: string
          tool?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mm_execution_actions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "mm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_execution_costs: {
        Row: {
          automation_id: string
          cost_usd: number | null
          created_at: string
          execution_id: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          provider: string | null
          user_id: string
        }
        Insert: {
          automation_id: string
          cost_usd?: number | null
          created_at?: string
          execution_id: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          user_id?: string
        }
        Update: {
          automation_id?: string
          cost_usd?: number | null
          created_at?: string
          execution_id?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mm_execution_costs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mm_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mm_execution_costs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "mm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_execution_logs: {
        Row: {
          agent_id: string | null
          created_at: string
          execution_id: string
          id: string
          level: string
          message: string
          payload: Json | null
          step: number
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          execution_id: string
          id?: string
          level?: string
          message: string
          payload?: Json | null
          step?: number
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          execution_id?: string
          id?: string
          level?: string
          message?: string
          payload?: Json | null
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "mm_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "mm_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_executions: {
        Row: {
          automation_id: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          output: Json | null
          started_at: string
          status: Database["public"]["Enums"]["execution_status"]
          trigger_id: string | null
        }
        Insert: {
          automation_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          trigger_id?: string | null
        }
        Update: {
          automation_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["execution_status"]
          trigger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mm_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mm_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mm_executions_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "mm_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      mm_schedules: {
        Row: {
          day_of_month: number
          enabled: boolean
          frequency: string
          hour_utc: number
          interval_minutes: number
          last_run_at: string | null
          minute_utc: number
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          day_of_month?: number
          enabled?: boolean
          frequency?: string
          hour_utc?: number
          interval_minutes?: number
          last_run_at?: string | null
          minute_utc?: number
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Update: {
          day_of_month?: number
          enabled?: boolean
          frequency?: string
          hour_utc?: number
          interval_minutes?: number
          last_run_at?: string | null
          minute_utc?: number
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      mm_tick_logs: {
        Row: {
          duration_ms: number
          error: string | null
          id: string
          launched_count: number
          ran_at: string
          results: Json
        }
        Insert: {
          duration_ms?: number
          error?: string | null
          id?: string
          launched_count?: number
          ran_at?: string
          results?: Json
        }
        Update: {
          duration_ms?: number
          error?: string | null
          id?: string
          launched_count?: number
          ran_at?: string
          results?: Json
        }
        Relationships: []
      }
      mm_triggers: {
        Row: {
          automation_id: string
          config: Json
          consecutive_failures: number | null
          created_at: string
          cron_expr: string | null
          enabled: boolean
          id: string
          last_error: string | null
          last_run_at: string | null
          next_run_at: string | null
          type: Database["public"]["Enums"]["trigger_type"]
        }
        Insert: {
          automation_id: string
          config?: Json
          consecutive_failures?: number | null
          created_at?: string
          cron_expr?: string | null
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          type?: Database["public"]["Enums"]["trigger_type"]
        }
        Update: {
          automation_id?: string
          config?: Json
          consecutive_failures?: number | null
          created_at?: string
          cron_expr?: string | null
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          type?: Database["public"]["Enums"]["trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mm_triggers_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "mm_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_at: string
          google_event_id: string | null
          id: string
          location: string | null
          project_id: string
          start_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          project_id: string
          start_at: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          project_id?: string
          start_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_coaching_sessions: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_coaching_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_expenses: {
        Row: {
          ai_extracted: Json | null
          amount: number
          category: string | null
          created_at: string
          currency: string
          description: string | null
          drive_file_id: string | null
          drive_file_url: string | null
          expense_date: string | null
          file_id: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          ai_extracted?: Json | null
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          drive_file_id?: string | null
          drive_file_url?: string | null
          expense_date?: string | null
          file_id?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Update: {
          ai_extracted?: Json | null
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          drive_file_id?: string | null
          drive_file_url?: string | null
          expense_date?: string | null
          file_id?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noject_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_google_connections: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          expires_at: string
          google_email: string | null
          refresh_token_ciphertext: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          refresh_token_ciphertext: string
          scope: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          refresh_token_ciphertext?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noject_meeting_transcripts: {
        Row: {
          audio_name: string | null
          created_at: string
          drive_file_id: string | null
          drive_file_url: string | null
          extracted_tasks: Json | null
          file_id: string | null
          id: string
          project_id: string
          summary: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_name?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_file_url?: string | null
          extracted_tasks?: Json | null
          file_id?: string | null
          id?: string
          project_id: string
          summary?: string | null
          transcript?: string | null
          user_id?: string
        }
        Update: {
          audio_name?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_file_url?: string | null
          extracted_tasks?: Json | null
          file_id?: string | null
          id?: string
          project_id?: string
          summary?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_meeting_transcripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          meta: Json | null
          project_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          meta?: Json | null
          project_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          meta?: Json | null
          project_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_project_files: {
        Row: {
          created_at: string
          folder: string
          id: string
          mime_type: string
          name: string
          project_id: string
          size_bytes: number
          source: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder?: string
          id?: string
          mime_type?: string
          name: string
          project_id: string
          size_bytes?: number
          source?: string
          storage_path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          folder?: string
          id?: string
          mime_type?: string
          name?: string
          project_id?: string
          size_bytes?: number
          source?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_projects: {
        Row: {
          ai_insights: Json | null
          ai_plan: Json | null
          budget: number | null
          calendar_id: string | null
          color: string | null
          created_at: string
          description: string | null
          doc_id: string | null
          doc_url: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          end_date: string | null
          health_data: Json | null
          health_score: number | null
          health_updated_at: string | null
          id: string
          insights_updated_at: string | null
          monte_carlo: Json | null
          name: string
          objective: string | null
          phase: Database["public"]["Enums"]["noject_project_phase"]
          progress: number
          sheet_id: string | null
          sheet_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["noject_project_status"]
          tasklist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          ai_plan?: Json | null
          budget?: number | null
          calendar_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          doc_id?: string | null
          doc_url?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          health_data?: Json | null
          health_score?: number | null
          health_updated_at?: string | null
          id?: string
          insights_updated_at?: string | null
          monte_carlo?: Json | null
          name: string
          objective?: string | null
          phase?: Database["public"]["Enums"]["noject_project_phase"]
          progress?: number
          sheet_id?: string | null
          sheet_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["noject_project_status"]
          tasklist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_insights?: Json | null
          ai_plan?: Json | null
          budget?: number | null
          calendar_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          doc_id?: string | null
          doc_url?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          end_date?: string | null
          health_data?: Json | null
          health_score?: number | null
          health_updated_at?: string | null
          id?: string
          insights_updated_at?: string | null
          monte_carlo?: Json | null
          name?: string
          objective?: string | null
          phase?: Database["public"]["Enums"]["noject_project_phase"]
          progress?: number
          sheet_id?: string | null
          sheet_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["noject_project_status"]
          tasklist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      noject_tasks: {
        Row: {
          actual_hours: number | null
          color: string | null
          completed_at: string | null
          created_at: string
          dependency_ids: string[] | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          google_task_id: string | null
          icon: string | null
          id: string
          notes: string | null
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["noject_task_priority"]
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["noject_task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_hours?: number | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          dependency_ids?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          google_task_id?: string | null
          icon?: string | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["noject_task_priority"]
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["noject_task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          actual_hours?: number | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          dependency_ids?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          google_task_id?: string | null
          icon?: string | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["noject_task_priority"]
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["noject_task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "noject_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noject_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_time_entries: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          note: string | null
          project_id: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "noject_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "noject_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noject_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "noject_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      noject_user_settings: {
        Row: {
          ai_model: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nxj_company_reports: {
        Row: {
          activities: Json
          company: string
          created_at: string
          culture: Json
          founded: string | null
          id: string
          interview_questions: Json
          key_people: Json
          location: string | null
          news: Json
          offer_id: string | null
          overview: string | null
          products: Json
          questions_to_ask: Json
          raw_notes: string | null
          risks: Json
          sector: string | null
          size: string | null
          sources: Json
          status: string
          strengths: Json
          talking_points: Json
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          activities?: Json
          company: string
          created_at?: string
          culture?: Json
          founded?: string | null
          id?: string
          interview_questions?: Json
          key_people?: Json
          location?: string | null
          news?: Json
          offer_id?: string | null
          overview?: string | null
          products?: Json
          questions_to_ask?: Json
          raw_notes?: string | null
          risks?: Json
          sector?: string | null
          size?: string | null
          sources?: Json
          status?: string
          strengths?: Json
          talking_points?: Json
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          activities?: Json
          company?: string
          created_at?: string
          culture?: Json
          founded?: string | null
          id?: string
          interview_questions?: Json
          key_people?: Json
          location?: string | null
          news?: Json
          offer_id?: string | null
          overview?: string | null
          products?: Json
          questions_to_ask?: Json
          raw_notes?: string | null
          risks?: Json
          sector?: string | null
          size?: string | null
          sources?: Json
          status?: string
          strengths?: Json
          talking_points?: Json
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      nxj_offers: {
        Row: {
          company: string | null
          contract_type: string | null
          cover_letter_hook: string | null
          created_at: string
          description: string | null
          favorite: boolean
          fetched_at: string
          fingerprint: string | null
          id: string
          interview_tips: Json
          keyword_gaps: Json
          keyword_matches: Json
          location: string | null
          match_type: string | null
          matching_skills: Json
          missing_skills: Json
          posted_at: string | null
          reasoning: string | null
          region_match: string | null
          remote: string | null
          risks: Json
          salary: string | null
          score: number
          score_breakdown: Json
          search_id: string | null
          sector: string | null
          seniority: string | null
          source: string | null
          source_domain: string | null
          status: string
          strengths: Json
          summary: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          company?: string | null
          contract_type?: string | null
          cover_letter_hook?: string | null
          created_at?: string
          description?: string | null
          favorite?: boolean
          fetched_at?: string
          fingerprint?: string | null
          id?: string
          interview_tips?: Json
          keyword_gaps?: Json
          keyword_matches?: Json
          location?: string | null
          match_type?: string | null
          matching_skills?: Json
          missing_skills?: Json
          posted_at?: string | null
          reasoning?: string | null
          region_match?: string | null
          remote?: string | null
          risks?: Json
          salary?: string | null
          score?: number
          score_breakdown?: Json
          search_id?: string | null
          sector?: string | null
          seniority?: string | null
          source?: string | null
          source_domain?: string | null
          status?: string
          strengths?: Json
          summary?: string | null
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          company?: string | null
          contract_type?: string | null
          cover_letter_hook?: string | null
          created_at?: string
          description?: string | null
          favorite?: boolean
          fetched_at?: string
          fingerprint?: string | null
          id?: string
          interview_tips?: Json
          keyword_gaps?: Json
          keyword_matches?: Json
          location?: string | null
          match_type?: string | null
          matching_skills?: Json
          missing_skills?: Json
          posted_at?: string | null
          reasoning?: string | null
          region_match?: string | null
          remote?: string | null
          risks?: Json
          salary?: string | null
          score?: number
          score_breakdown?: Json
          search_id?: string | null
          sector?: string | null
          seniority?: string | null
          source?: string | null
          source_domain?: string | null
          status?: string
          strengths?: Json
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nxj_offers_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "nxj_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      nxj_preferences: {
        Row: {
          brief: string | null
          company_size: string | null
          contract_types: Json
          created_at: string
          exclusions: Json
          experience_max: number | null
          experience_min: number | null
          flexibility: string
          freshness: string
          id: string
          include_similar: boolean
          keywords: Json
          languages: Json
          locations: Json
          min_results: number
          min_salary: number | null
          notes: string | null
          region: string
          region_strict: boolean
          remote: string
          sector: string | null
          sectors: Json
          seniority: string | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: string | null
          company_size?: string | null
          contract_types?: Json
          created_at?: string
          exclusions?: Json
          experience_max?: number | null
          experience_min?: number | null
          flexibility?: string
          freshness?: string
          id?: string
          include_similar?: boolean
          keywords?: Json
          languages?: Json
          locations?: Json
          min_results?: number
          min_salary?: number | null
          notes?: string | null
          region?: string
          region_strict?: boolean
          remote?: string
          sector?: string | null
          sectors?: Json
          seniority?: string | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brief?: string | null
          company_size?: string | null
          contract_types?: Json
          created_at?: string
          exclusions?: Json
          experience_max?: number | null
          experience_min?: number | null
          flexibility?: string
          freshness?: string
          id?: string
          include_similar?: boolean
          keywords?: Json
          languages?: Json
          locations?: Json
          min_results?: number
          min_salary?: number | null
          notes?: string | null
          region?: string
          region_strict?: boolean
          remote?: string
          sector?: string | null
          sectors?: Json
          seniority?: string | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nxj_profiles: {
        Row: {
          certifications: Json
          completion: number
          cover_letter_filename: string | null
          cover_letter_text: string | null
          created_at: string
          cv_filename: string | null
          cv_text: string | null
          educations: Json
          email: string | null
          experiences: Json
          full_name: string | null
          headline: string | null
          id: string
          languages: Json
          links: Json
          location: string | null
          motivations: Json
          phone: string | null
          skills: Json
          soft_skills: Json
          summary: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          certifications?: Json
          completion?: number
          cover_letter_filename?: string | null
          cover_letter_text?: string | null
          created_at?: string
          cv_filename?: string | null
          cv_text?: string | null
          educations?: Json
          email?: string | null
          experiences?: Json
          full_name?: string | null
          headline?: string | null
          id?: string
          languages?: Json
          links?: Json
          location?: string | null
          motivations?: Json
          phone?: string | null
          skills?: Json
          soft_skills?: Json
          summary?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          certifications?: Json
          completion?: number
          cover_letter_filename?: string | null
          cover_letter_text?: string | null
          created_at?: string
          cv_filename?: string | null
          cv_text?: string | null
          educations?: Json
          email?: string | null
          experiences?: Json
          full_name?: string | null
          headline?: string | null
          id?: string
          languages?: Json
          links?: Json
          location?: string | null
          motivations?: Json
          phone?: string | null
          skills?: Json
          soft_skills?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      nxj_searches: {
        Row: {
          avg_score: number | null
          brief: string | null
          created_at: string
          decisions: Json
          error: string | null
          finished_at: string | null
          id: string
          locations: Json
          logs: Json
          plan: Json
          progress: number
          query: string
          results_count: number
          sources: Json
          stage: string | null
          status: string
          target_role: string | null
          user_id: string
        }
        Insert: {
          avg_score?: number | null
          brief?: string | null
          created_at?: string
          decisions?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          locations?: Json
          logs?: Json
          plan?: Json
          progress?: number
          query: string
          results_count?: number
          sources?: Json
          stage?: string | null
          status?: string
          target_role?: string | null
          user_id: string
        }
        Update: {
          avg_score?: number | null
          brief?: string | null
          created_at?: string
          decisions?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          locations?: Json
          logs?: Json
          plan?: Json
          progress?: number
          query?: string
          results_count?: number
          sources?: Json
          stage?: string | null
          status?: string
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nxj_settings: {
        Row: {
          ai_autotune: boolean
          ai_extraction_model: string
          ai_model: string
          company_research_pages: number
          concurrency: number
          country: string
          created_at: string
          dedupe_by_title: boolean
          deep_scrape_limit: number
          enforce_region: boolean
          fallback_min_score: number
          firecrawl_api_key: string | null
          firecrawl_block_ads: boolean
          firecrawl_exclude_tags: Json
          firecrawl_include_tags: Json
          firecrawl_max_age_ms: number
          firecrawl_mobile: boolean
          firecrawl_mode: string
          firecrawl_remove_base64: boolean
          firecrawl_search_limit: number
          firecrawl_skip_tls: boolean
          firecrawl_timeout_ms: number
          id: string
          languages: Json
          max_pages_per_source: number
          max_rounds: number
          min_score: number
          only_main_content: boolean
          proxy_mode: string
          request_delay_ms: number
          respect_robots: boolean
          scoring_batch_size: number
          scrape_formats: Json
          scroll_delay_ms: number
          scroll_jitter_ms: number
          scroll_steps: number
          sources: Json
          updated_at: string
          user_id: string
          wait_for_ms: number
        }
        Insert: {
          ai_autotune?: boolean
          ai_extraction_model?: string
          ai_model?: string
          company_research_pages?: number
          concurrency?: number
          country?: string
          created_at?: string
          dedupe_by_title?: boolean
          deep_scrape_limit?: number
          enforce_region?: boolean
          fallback_min_score?: number
          firecrawl_api_key?: string | null
          firecrawl_block_ads?: boolean
          firecrawl_exclude_tags?: Json
          firecrawl_include_tags?: Json
          firecrawl_max_age_ms?: number
          firecrawl_mobile?: boolean
          firecrawl_mode?: string
          firecrawl_remove_base64?: boolean
          firecrawl_search_limit?: number
          firecrawl_skip_tls?: boolean
          firecrawl_timeout_ms?: number
          id?: string
          languages?: Json
          max_pages_per_source?: number
          max_rounds?: number
          min_score?: number
          only_main_content?: boolean
          proxy_mode?: string
          request_delay_ms?: number
          respect_robots?: boolean
          scoring_batch_size?: number
          scrape_formats?: Json
          scroll_delay_ms?: number
          scroll_jitter_ms?: number
          scroll_steps?: number
          sources?: Json
          updated_at?: string
          user_id: string
          wait_for_ms?: number
        }
        Update: {
          ai_autotune?: boolean
          ai_extraction_model?: string
          ai_model?: string
          company_research_pages?: number
          concurrency?: number
          country?: string
          created_at?: string
          dedupe_by_title?: boolean
          deep_scrape_limit?: number
          enforce_region?: boolean
          fallback_min_score?: number
          firecrawl_api_key?: string | null
          firecrawl_block_ads?: boolean
          firecrawl_exclude_tags?: Json
          firecrawl_include_tags?: Json
          firecrawl_max_age_ms?: number
          firecrawl_mobile?: boolean
          firecrawl_mode?: string
          firecrawl_remove_base64?: boolean
          firecrawl_search_limit?: number
          firecrawl_skip_tls?: boolean
          firecrawl_timeout_ms?: number
          id?: string
          languages?: Json
          max_pages_per_source?: number
          max_rounds?: number
          min_score?: number
          only_main_content?: boolean
          proxy_mode?: string
          request_delay_ms?: number
          respect_robots?: boolean
          scoring_batch_size?: number
          scrape_formats?: Json
          scroll_delay_ms?: number
          scroll_jitter_ms?: number
          scroll_steps?: number
          sources?: Json
          updated_at?: string
          user_id?: string
          wait_for_ms?: number
        }
        Relationships: []
      }
      ocktavus_chat_link_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocktavus_chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocktavus_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ocktavus_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ocktavus_chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocktavus_gmail_credentials: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          refresh_token: string
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          refresh_token: string
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          refresh_token?: string
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocktavus_google_chat_links: {
        Row: {
          display_name: string | null
          linked_at: string
          space_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          linked_at?: string
          space_id: string
          user_id?: string
        }
        Update: {
          display_name?: string | null
          linked_at?: string
          space_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ocktavus_google_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          space_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          space_id: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocktavus_google_chat_messages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "ocktavus_google_chat_links"
            referencedColumns: ["space_id"]
          },
        ]
      }
      ocktavus_google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      odoo_connections: {
        Row: {
          api_key: string
          db: string
          last_tested_at: string | null
          modules: Json
          status: string
          status_message: string | null
          uid: number | null
          updated_at: string
          url: string
          user_id: string
          username: string
        }
        Insert: {
          api_key: string
          db: string
          last_tested_at?: string | null
          modules?: Json
          status?: string
          status_message?: string | null
          uid?: number | null
          updated_at?: string
          url: string
          user_id?: string
          username: string
        }
        Update: {
          api_key?: string
          db?: string
          last_tested_at?: string | null
          modules?: Json
          status?: string
          status_message?: string | null
          uid?: number | null
          updated_at?: string
          url?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ow_build_logs: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          level: string
          message: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          level?: string
          message: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          level?: string
          message?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ow_build_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ow_site_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ow_site_projects: {
        Row: {
          brief: Json
          created_at: string
          id: string
          name: string
          plan: Json | null
          progress: number
          status: string
          style: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: Json
          created_at?: string
          id?: string
          name?: string
          plan?: Json | null
          progress?: number
          status?: string
          style?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brief?: Json
          created_at?: string
          id?: string
          name?: string
          plan?: Json | null
          progress?: number
          status?: string
          style?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pa_activity_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          item_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          item_id?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pa_activity_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pa_planning_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_agent_instructions: {
        Row: {
          ai_model: string | null
          break_habits: string | null
          communication_style: string | null
          custom_rules: string | null
          extra: Json | null
          priorities: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          work_style: string | null
          working_hours: Json | null
        }
        Insert: {
          ai_model?: string | null
          break_habits?: string | null
          communication_style?: string | null
          custom_rules?: string | null
          extra?: Json | null
          priorities?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          work_style?: string | null
          working_hours?: Json | null
        }
        Update: {
          ai_model?: string | null
          break_habits?: string | null
          communication_style?: string | null
          custom_rules?: string | null
          extra?: Json | null
          priorities?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          work_style?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      pa_ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pa_ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pa_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pa_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pa_google_connections: {
        Row: {
          access_token: string
          calendar_sync_token: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          last_sync_at: string | null
          refresh_token: string | null
          scope: string | null
          tasks_sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_sync_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          tasks_sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string
          calendar_sync_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          tasks_sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pa_planning_items: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          board_column: string | null
          color: string | null
          created_at: string
          description: string | null
          due_at: string | null
          duration_min: number | null
          end_at: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          google_synced_at: string | null
          google_task_id: string | null
          google_task_list_id: string | null
          icon: string | null
          id: string
          kind: string
          location: string | null
          metadata: Json | null
          notes: string | null
          position: number | null
          priority: string | null
          start_at: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          board_column?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_min?: number | null
          end_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          google_task_id?: string | null
          google_task_list_id?: string | null
          icon?: string | null
          id?: string
          kind?: string
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          position?: number | null
          priority?: string | null
          start_at?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          board_column?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_min?: number | null
          end_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_synced_at?: string | null
          google_task_id?: string | null
          google_task_list_id?: string | null
          icon?: string | null
          id?: string
          kind?: string
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          position?: number | null
          priority?: string | null
          start_at?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pe_companies: {
        Row: {
          address: string | null
          ai_summary: string | null
          approach_angle: Json
          city: string | null
          confidence: string | null
          country: string | null
          created_at: string
          decision_makers: Json
          description: string | null
          email: string | null
          founded_year: string | null
          id: string
          legal_info: Json
          legal_name: string | null
          linkedin: string | null
          name: string
          phone: string | null
          pipeline_status: string
          prospect_understanding: Json
          region: string | null
          relevance_score: number
          score_breakdown: Json
          score_explanation: string | null
          search_id: string | null
          sector: string | null
          signals: Json
          size: string | null
          socials: Json
          sources: Json
          subsector: string | null
          updated_at: string
          user_id: string
          website: string | null
          why_contact: string | null
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          approach_angle?: Json
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          description?: string | null
          email?: string | null
          founded_year?: string | null
          id?: string
          legal_info?: Json
          legal_name?: string | null
          linkedin?: string | null
          name: string
          phone?: string | null
          pipeline_status?: string
          prospect_understanding?: Json
          region?: string | null
          relevance_score?: number
          score_breakdown?: Json
          score_explanation?: string | null
          search_id?: string | null
          sector?: string | null
          signals?: Json
          size?: string | null
          socials?: Json
          sources?: Json
          subsector?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          why_contact?: string | null
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          approach_angle?: Json
          city?: string | null
          confidence?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          description?: string | null
          email?: string | null
          founded_year?: string | null
          id?: string
          legal_info?: Json
          legal_name?: string | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          pipeline_status?: string
          prospect_understanding?: Json
          region?: string | null
          relevance_score?: number
          score_breakdown?: Json
          score_explanation?: string | null
          search_id?: string | null
          sector?: string | null
          signals?: Json
          size?: string | null
          socials?: Json
          sources?: Json
          subsector?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          why_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pe_companies_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "pe_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_decisions: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          interest_score: number | null
          kind: string
          payload: Json
          prospection_id: string | null
          rationale: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          interest_score?: number | null
          kind: string
          payload?: Json
          prospection_id?: string | null
          rationale?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          interest_score?: number | null
          kind?: string
          payload?: Json
          prospection_id?: string | null
          rationale?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pe_decisions_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "pe_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_messages: {
        Row: {
          analysis: Json
          body: string | null
          checks: Json
          created_at: string
          direction: string
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          prospection_id: string
          sent_at: string
          snippet: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json
          body?: string | null
          checks?: Json
          created_at?: string
          direction: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          prospection_id: string
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json
          body?: string | null
          checks?: Json
          created_at?: string
          direction?: string
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          prospection_id?: string
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pe_messages_prospection_id_fkey"
            columns: ["prospection_id"]
            isOneToOne: false
            referencedRelation: "pe_prospections"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_prospections: {
        Row: {
          company_id: string
          contact_email: string | null
          created_at: string
          error: string | null
          follow_up_count: number
          gmail_thread_id: string | null
          id: string
          interest_score: number | null
          last_gmail_history_id: string | null
          last_intent: string | null
          last_message_at: string | null
          max_follow_ups: number
          memory: Json
          next_check_at: string | null
          pipeline_status: string
          state: string
          stop_reason: string | null
          strategy: Json
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          created_at?: string
          error?: string | null
          follow_up_count?: number
          gmail_thread_id?: string | null
          id?: string
          interest_score?: number | null
          last_gmail_history_id?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          max_follow_ups?: number
          memory?: Json
          next_check_at?: string | null
          pipeline_status?: string
          state?: string
          stop_reason?: string | null
          strategy?: Json
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          created_at?: string
          error?: string | null
          follow_up_count?: number
          gmail_thread_id?: string | null
          id?: string
          interest_score?: number | null
          last_gmail_history_id?: string | null
          last_intent?: string | null
          last_message_at?: string | null
          max_follow_ups?: number
          memory?: Json
          next_check_at?: string | null
          pipeline_status?: string
          state?: string
          stop_reason?: string | null
          strategy?: Json
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pe_prospections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pe_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pe_searches: {
        Row: {
          created_at: string
          error: string | null
          id: string
          normalized_queries: Json
          progress: string | null
          quantity: number
          raw_query: string
          status: string
          structured: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          normalized_queries?: Json
          progress?: string | null
          quantity?: number
          raw_query: string
          status?: string
          structured?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          normalized_queries?: Json
          progress?: string | null
          quantity?: number
          raw_query?: string
          status?: string
          structured?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pe_settings: {
        Row: {
          agent_name: string
          auto_reply: boolean
          calendar_link: string | null
          check_interval_minutes: number
          company_name: string | null
          created_at: string
          cta_type: string
          email_length: string
          follow_up_delay_hours: number
          forbidden_claims: string | null
          language: string
          max_follow_ups: number
          meeting_slots: string | null
          model_analysis: string
          model_research: string
          model_writing: string
          offer_description: string | null
          playbook: Json
          require_validation: boolean
          sender_name: string | null
          sender_role: string | null
          signature: string | null
          target_persona: string | null
          tone: string
          updated_at: string
          user_id: string
          value_proposition: string | null
        }
        Insert: {
          agent_name?: string
          auto_reply?: boolean
          calendar_link?: string | null
          check_interval_minutes?: number
          company_name?: string | null
          created_at?: string
          cta_type?: string
          email_length?: string
          follow_up_delay_hours?: number
          forbidden_claims?: string | null
          language?: string
          max_follow_ups?: number
          meeting_slots?: string | null
          model_analysis?: string
          model_research?: string
          model_writing?: string
          offer_description?: string | null
          playbook?: Json
          require_validation?: boolean
          sender_name?: string | null
          sender_role?: string | null
          signature?: string | null
          target_persona?: string | null
          tone?: string
          updated_at?: string
          user_id: string
          value_proposition?: string | null
        }
        Update: {
          agent_name?: string
          auto_reply?: boolean
          calendar_link?: string | null
          check_interval_minutes?: number
          company_name?: string | null
          created_at?: string
          cta_type?: string
          email_length?: string
          follow_up_delay_hours?: number
          forbidden_claims?: string | null
          language?: string
          max_follow_ups?: number
          meeting_slots?: string | null
          model_analysis?: string
          model_research?: string
          model_writing?: string
          offer_description?: string | null
          playbook?: Json
          require_validation?: boolean
          sender_name?: string | null
          sender_role?: string | null
          signature?: string | null
          target_persona?: string | null
          tone?: string
          updated_at?: string
          user_id?: string
          value_proposition?: string | null
        }
        Relationships: []
      }
      pls_chat_messages: {
        Row: {
          content: string
          created_at: string
          highlights: Json
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          highlights?: Json
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          highlights?: Json
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      pls_kpi_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_model: string
          avatar_url: string | null
          background_opacity: number | null
          background_url: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          studio_name: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          ai_model?: string
          avatar_url?: string | null
          background_opacity?: number | null
          background_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          studio_name?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          ai_model?: string
          avatar_url?: string | null
          background_opacity?: number | null
          background_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          studio_name?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      psc_action_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          is_default: boolean
          name: string
          steps: Json
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          name: string
          steps?: Json
          trigger?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          name?: string
          steps?: Json
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_agent_config: {
        Row: {
          agent_name: string
          aggressiveness: number
          auto_confirm_meetings: boolean
          autonomous_replies: boolean
          calendar_id: string
          followup_delay_hours: number
          goals: string
          greeting: string | null
          guardrails: string
          language: string
          max_followups: number
          max_total_touches: number
          meeting_duration_min: number
          mood_rules: string | null
          never_give_up: boolean
          paused: boolean
          persistence_rules: string | null
          sender_name: string
          sender_role: string
          signature: string
          system_prompt: string | null
          timezone: string
          tone: string
          updated_at: string
          user_id: string
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          agent_name?: string
          aggressiveness?: number
          auto_confirm_meetings?: boolean
          autonomous_replies?: boolean
          calendar_id?: string
          followup_delay_hours?: number
          goals?: string
          greeting?: string | null
          guardrails?: string
          language?: string
          max_followups?: number
          max_total_touches?: number
          meeting_duration_min?: number
          mood_rules?: string | null
          never_give_up?: boolean
          paused?: boolean
          persistence_rules?: string | null
          sender_name?: string
          sender_role?: string
          signature?: string
          system_prompt?: string | null
          timezone?: string
          tone?: string
          updated_at?: string
          user_id: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          agent_name?: string
          aggressiveness?: number
          auto_confirm_meetings?: boolean
          autonomous_replies?: boolean
          calendar_id?: string
          followup_delay_hours?: number
          goals?: string
          greeting?: string | null
          guardrails?: string
          language?: string
          max_followups?: number
          max_total_touches?: number
          meeting_duration_min?: number
          mood_rules?: string | null
          never_give_up?: boolean
          paused?: boolean
          persistence_rules?: string | null
          sender_name?: string
          sender_role?: string
          signature?: string
          system_prompt?: string | null
          timezone?: string
          tone?: string
          updated_at?: string
          user_id?: string
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      psc_agent_memory: {
        Row: {
          context: string
          created_at: string
          id: string
          kind: string
          outcome: string
          prospect_id: string | null
          technique: string
          user_id: string
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          kind: string
          outcome?: string
          prospect_id?: string | null
          technique: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          kind?: string
          outcome?: string
          prospect_id?: string | null
          technique?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_agent_memory_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "psc_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_agent_runs: {
        Row: {
          attempts: number | null
          created_at: string
          detail: string | null
          duration_ms: number | null
          error_step: string | null
          id: string
          io: Json | null
          kind: Database["public"]["Enums"]["psc_agent_run_kind"]
          prospect_id: string | null
          skip_reason: string | null
          status: Database["public"]["Enums"]["psc_agent_run_status"]
          tool: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          detail?: string | null
          duration_ms?: number | null
          error_step?: string | null
          id?: string
          io?: Json | null
          kind: Database["public"]["Enums"]["psc_agent_run_kind"]
          prospect_id?: string | null
          skip_reason?: string | null
          status: Database["public"]["Enums"]["psc_agent_run_status"]
          tool?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          detail?: string | null
          duration_ms?: number | null
          error_step?: string | null
          id?: string
          io?: Json | null
          kind?: Database["public"]["Enums"]["psc_agent_run_kind"]
          prospect_id?: string | null
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["psc_agent_run_status"]
          tool?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_agent_runs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "psc_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_agent_skills: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          id: string
          priority: number
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          content: string
          created_at?: string
          id?: string
          priority?: number
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          id?: string
          priority?: number
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_agent_tools: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          kind: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_auto_skills: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          loss_count: number
          score: number
          summary: string
          tactic: string
          updated_at: string
          user_id: string
          win_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          loss_count?: number
          score?: number
          summary: string
          tactic: string
          updated_at?: string
          user_id: string
          win_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          loss_count?: number
          score?: number
          summary?: string
          tactic?: string
          updated_at?: string
          user_id?: string
          win_count?: number
        }
        Relationships: []
      }
      psc_conversations: {
        Row: {
          created_at: string
          gmail_thread_id: string | null
          id: string
          last_history_id: string | null
          last_message_at: string | null
          prospect_id: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_thread_id?: string | null
          id?: string
          last_history_id?: string | null
          last_message_at?: string | null
          prospect_id: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_thread_id?: string | null
          id?: string
          last_history_id?: string | null
          last_message_at?: string | null
          prospect_id?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_conversations_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "psc_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_cron_config: {
        Row: {
          created_at: string
          followups_enabled: boolean
          followups_interval_minutes: number
          fully_autonomous: boolean
          last_followups_at: string | null
          last_replies_at: string | null
          last_scan_at: string | null
          replies_enabled: boolean
          replies_interval_minutes: number
          scan_enabled: boolean
          scan_interval_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followups_enabled?: boolean
          followups_interval_minutes?: number
          fully_autonomous?: boolean
          last_followups_at?: string | null
          last_replies_at?: string | null
          last_scan_at?: string | null
          replies_enabled?: boolean
          replies_interval_minutes?: number
          scan_enabled?: boolean
          scan_interval_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          followups_enabled?: boolean
          followups_interval_minutes?: number
          fully_autonomous?: boolean
          last_followups_at?: string | null
          last_replies_at?: string | null
          last_scan_at?: string | null
          replies_enabled?: boolean
          replies_interval_minutes?: number
          scan_enabled?: boolean
          scan_interval_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_google_connections: {
        Row: {
          connected_at: string
          encrypted_refresh_token: string
          encryption_iv: string
          google_email: string
          scopes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          encrypted_refresh_token: string
          encryption_iv: string
          google_email: string
          scopes: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          encrypted_refresh_token?: string
          encryption_iv?: string
          google_email?: string
          scopes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_knowledge_base: {
        Row: {
          case_studies: string
          company_description: string
          faq: string
          meeting_proposal: string
          objections_handling: string
          pricing_notes: string
          services: string
          target_clients: string
          updated_at: string
          user_id: string
          value_proposition: string
          values: string
        }
        Insert: {
          case_studies?: string
          company_description?: string
          faq?: string
          meeting_proposal?: string
          objections_handling?: string
          pricing_notes?: string
          services?: string
          target_clients?: string
          updated_at?: string
          user_id: string
          value_proposition?: string
          values?: string
        }
        Update: {
          case_studies?: string
          company_description?: string
          faq?: string
          meeting_proposal?: string
          objections_handling?: string
          pricing_notes?: string
          services?: string
          target_clients?: string
          updated_at?: string
          user_id?: string
          value_proposition?: string
          values?: string
        }
        Relationships: []
      }
      psc_kpi_events: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json
          prospect_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json
          prospect_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          prospect_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_kpi_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "psc_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          gmail_message_id: string | null
          id: string
          role: Database["public"]["Enums"]["psc_message_role"]
          sent_at: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          gmail_message_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["psc_message_role"]
          sent_at?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          gmail_message_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["psc_message_role"]
          sent_at?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "psc_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_prospect_state: {
        Row: {
          active_plan_id: string | null
          meeting_iso: string | null
          mood: string
          notes: string
          plan_step: number
          prospect_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_plan_id?: string | null
          meeting_iso?: string | null
          mood?: string
          notes?: string
          plan_step?: number
          prospect_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_plan_id?: string | null
          meeting_iso?: string | null
          mood?: string
          notes?: string
          plan_step?: number
          prospect_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_prospect_state_active_plan_id_fkey"
            columns: ["active_plan_id"]
            isOneToOne: false
            referencedRelation: "psc_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psc_prospect_state_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "psc_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_prospects: {
        Row: {
          company: string | null
          context: string | null
          created_at: string
          email: string
          followups_sent: number
          full_name: string | null
          id: string
          last_action_at: string | null
          next_action_at: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["psc_prospect_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          context?: string | null
          created_at?: string
          email: string
          followups_sent?: number
          full_name?: string | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["psc_prospect_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          context?: string | null
          created_at?: string
          email?: string
          followups_sent?: number
          full_name?: string | null
          id?: string
          last_action_at?: string | null
          next_action_at?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["psc_prospect_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psc_prospects_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "psc_sheet_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      psc_sheet_sources: {
        Row: {
          company_column: string | null
          context_column: string | null
          created_at: string
          display_name: string | null
          email_column: string
          id: string
          is_active: boolean
          last_row_seen: number
          name_column: string | null
          sheet_name: string
          spreadsheet_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_column?: string | null
          context_column?: string | null
          created_at?: string
          display_name?: string | null
          email_column?: string
          id?: string
          is_active?: boolean
          last_row_seen?: number
          name_column?: string | null
          sheet_name?: string
          spreadsheet_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_column?: string | null
          context_column?: string | null
          created_at?: string
          display_name?: string | null
          email_column?: string
          id?: string
          is_active?: boolean
          last_row_seen?: number
          name_column?: string | null
          sheet_name?: string
          spreadsheet_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psc_tick_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          result: Json | null
          scope: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          result?: Json | null
          scope: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          result?: Json | null
          scope?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pst_agents: {
        Row: {
          assistant_name: string
          callback_enabled: boolean
          callback_hours: string
          company: string
          created_at: string
          id: string
          instructions: string
          name: string
          owner_id: string
          sav_enabled: boolean
          ticket_model: string
          updated_at: string
        }
        Insert: {
          assistant_name?: string
          callback_enabled?: boolean
          callback_hours?: string
          company?: string
          created_at?: string
          id?: string
          instructions?: string
          name?: string
          owner_id: string
          sav_enabled?: boolean
          ticket_model?: string
          updated_at?: string
        }
        Update: {
          assistant_name?: string
          callback_enabled?: boolean
          callback_hours?: string
          company?: string
          created_at?: string
          id?: string
          instructions?: string
          name?: string
          owner_id?: string
          sav_enabled?: boolean
          ticket_model?: string
          updated_at?: string
        }
        Relationships: []
      }
      pst_calls: {
        Row: {
          actions: Json
          agent_id: string
          ai_summary: string | null
          created_at: string
          customer_name: string | null
          id: string
          outcome: string | null
          owner_id: string
          partner_id: number | null
          transcript: string
        }
        Insert: {
          actions?: Json
          agent_id: string
          ai_summary?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          outcome?: string | null
          owner_id: string
          partner_id?: number | null
          transcript?: string
        }
        Update: {
          actions?: Json
          agent_id?: string
          ai_summary?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          outcome?: string | null
          owner_id?: string
          partner_id?: number | null
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "pst_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "pst_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      pw_projects: {
        Row: {
          brief: string
          created_at: string
          design: Json
          id: string
          name: string
          page_html: string | null
          page_x: number
          page_y: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: string
          created_at?: string
          design?: Json
          id?: string
          name?: string
          page_html?: string | null
          page_x?: number
          page_y?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          brief?: string
          created_at?: string
          design?: Json
          id?: string
          name?: string
          page_html?: string | null
          page_x?: number
          page_y?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pw_sections: {
        Row: {
          annotations: Json
          config: Json
          created_at: string
          description: string
          html: string | null
          id: string
          in_page: boolean
          page_order: number
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          annotations?: Json
          config?: Json
          created_at?: string
          description?: string
          html?: string | null
          id?: string
          in_page?: boolean
          page_order?: number
          project_id: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Update: {
          annotations?: Json
          config?: Json
          created_at?: string
          description?: string
          html?: string | null
          id?: string
          in_page?: boolean
          page_order?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "pw_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pw_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      qf_queue_entries: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          queue_id: string
          reason: string | null
          served_at: string | null
          sort_order: number
          status: string
          ticket_number: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          queue_id: string
          reason?: string | null
          served_at?: string | null
          sort_order?: number
          status?: string
          ticket_number?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          queue_id?: string
          reason?: string | null
          served_at?: string | null
          sort_order?: number
          status?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "qf_queue_entries_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "qf_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      qf_queues: {
        Row: {
          business_name: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: []
      }
      sa_contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["sa_contact_kind"] | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          siret: string | null
          updated_at: string | null
          user_id: string
          vat_number: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sa_contact_kind"] | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sa_contact_kind"] | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      sa_documents: {
        Row: {
          accounting_entry_id: string | null
          attachment_name: string | null
          attachment_path: string | null
          bap_approved_at: string | null
          bap_approved_by: string | null
          contact: Json | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          delivery_address: string | null
          delivery_date: string | null
          discount_percent: number | null
          due_date: string | null
          history: Json | null
          id: string
          is_locked: boolean | null
          issue_date: string | null
          items: Json | null
          matching_notes: string | null
          matching_status: string | null
          notes: string | null
          number: string
          payment_terms: string | null
          reception_ok: boolean | null
          reception_remarks: string | null
          root_id: string | null
          shipping: number | null
          signature_data_url: string | null
          signed_at: string | null
          signer_name: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["sa_doc_status"] | null
          supplier_reference: string | null
          title: string | null
          total_ht: number | null
          total_ttc: number | null
          total_vat: number | null
          type: Database["public"]["Enums"]["sa_doc_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accounting_entry_id?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          bap_approved_at?: string | null
          bap_approved_by?: string | null
          contact?: Json | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          discount_percent?: number | null
          due_date?: string | null
          history?: Json | null
          id?: string
          is_locked?: boolean | null
          issue_date?: string | null
          items?: Json | null
          matching_notes?: string | null
          matching_status?: string | null
          notes?: string | null
          number: string
          payment_terms?: string | null
          reception_ok?: boolean | null
          reception_remarks?: string | null
          root_id?: string | null
          shipping?: number | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["sa_doc_status"] | null
          supplier_reference?: string | null
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type: Database["public"]["Enums"]["sa_doc_type"]
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          accounting_entry_id?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          bap_approved_at?: string | null
          bap_approved_by?: string | null
          contact?: Json | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          discount_percent?: number | null
          due_date?: string | null
          history?: Json | null
          id?: string
          is_locked?: boolean | null
          issue_date?: string | null
          items?: Json | null
          matching_notes?: string | null
          matching_status?: string | null
          notes?: string | null
          number?: string
          payment_terms?: string | null
          reception_ok?: boolean | null
          reception_remarks?: string | null
          root_id?: string | null
          shipping?: number | null
          signature_data_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["sa_doc_status"] | null
          supplier_reference?: string | null
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type?: Database["public"]["Enums"]["sa_doc_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sa_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_documents_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "sa_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sa_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sa_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_payments: {
        Row: {
          amount: number
          created_at: string | null
          document_id: string
          id: string
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          document_id: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          document_id?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sa_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sa_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sa_products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["sa_product_kind"] | null
          name: string
          reference: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          user_id: string
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sa_product_kind"] | null
          name: string
          reference?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          user_id?: string
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sa_product_kind"] | null
          name?: string
          reference?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          user_id?: string
          vat_rate?: number | null
        }
        Relationships: []
      }
      sa_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          capital: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          credit_note_prefix: string | null
          currency: string | null
          default_payment_terms: string | null
          delivery_footer: string | null
          delivery_prefix: string | null
          early_payment_discount: string | null
          email: string | null
          iban: string | null
          invoice_footer: string | null
          invoice_prefix: string | null
          late_penalty_rate: string | null
          legal_form: string | null
          legal_mentions: string | null
          logo_data_url: string | null
          order_footer: string | null
          order_prefix: string | null
          phone: string | null
          primary_color: string | null
          quote_footer: string | null
          quote_prefix: string | null
          rcs_city: string | null
          recovery_fee_mention: boolean | null
          siret: string | null
          updated_at: string | null
          user_id: string
          vat_exemption_mention: string | null
          vat_number: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          capital?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_note_prefix?: string | null
          currency?: string | null
          default_payment_terms?: string | null
          delivery_footer?: string | null
          delivery_prefix?: string | null
          early_payment_discount?: string | null
          email?: string | null
          iban?: string | null
          invoice_footer?: string | null
          invoice_prefix?: string | null
          late_penalty_rate?: string | null
          legal_form?: string | null
          legal_mentions?: string | null
          logo_data_url?: string | null
          order_footer?: string | null
          order_prefix?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_footer?: string | null
          quote_prefix?: string | null
          rcs_city?: string | null
          recovery_fee_mention?: boolean | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string
          vat_exemption_mention?: string | null
          vat_number?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          capital?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_note_prefix?: string | null
          currency?: string | null
          default_payment_terms?: string | null
          delivery_footer?: string | null
          delivery_prefix?: string | null
          early_payment_discount?: string | null
          email?: string | null
          iban?: string | null
          invoice_footer?: string | null
          invoice_prefix?: string | null
          late_penalty_rate?: string | null
          legal_form?: string | null
          legal_mentions?: string | null
          logo_data_url?: string | null
          order_footer?: string | null
          order_prefix?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_footer?: string | null
          quote_prefix?: string | null
          rcs_city?: string | null
          recovery_fee_mention?: boolean | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string
          vat_exemption_mention?: string | null
          vat_number?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      sendy_email_threads: {
        Row: {
          body: string | null
          created_at: string | null
          direction: string | null
          from_email: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          opportunity_id: string
          provider: string | null
          provider_message_id: string | null
          received_at: string | null
          snippet: string | null
          status: string | null
          subject: string | null
          to_email: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          direction?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          opportunity_id: string
          provider?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          direction?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          opportunity_id?: string
          provider?: string | null
          provider_message_id?: string | null
          received_at?: string | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sendy_mail_attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          filename: string
          id: string
          message_id: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          filename: string
          id?: string
          message_id: string
          size_bytes?: number | null
          storage_path: string
          user_id?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          message_id?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sendy_mail_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sendy_mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      sendy_mail_messages: {
        Row: {
          app_source: string | null
          body_html: string | null
          body_text: string | null
          cc_addresses: string | null
          created_at: string | null
          document_id: string | null
          document_number: string | null
          folder: string | null
          from_address: string
          from_name: string | null
          id: string
          is_priority: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          provider_message_id: string | null
          raw_mime: string | null
          subject: string
          to_addresses: string
          user_id: string
        }
        Insert: {
          app_source?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string | null
          created_at?: string | null
          document_id?: string | null
          document_number?: string | null
          folder?: string | null
          from_address: string
          from_name?: string | null
          id?: string
          is_priority?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          provider_message_id?: string | null
          raw_mime?: string | null
          subject: string
          to_addresses: string
          user_id?: string
        }
        Update: {
          app_source?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string | null
          created_at?: string | null
          document_id?: string | null
          document_number?: string | null
          folder?: string | null
          from_address?: string
          from_name?: string | null
          id?: string
          is_priority?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          provider_message_id?: string | null
          raw_mime?: string | null
          subject?: string
          to_addresses?: string
          user_id?: string
        }
        Relationships: []
      }
      sendy_mail_templates: {
        Row: {
          app: string
          body_template: string
          created_at: string | null
          doc_type: string
          id: string
          subject_template: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app: string
          body_template: string
          created_at?: string | null
          doc_type: string
          id?: string
          subject_template: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          app?: string
          body_template?: string
          created_at?: string | null
          doc_type?: string
          id?: string
          subject_template?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sendy_mailboxes: {
        Row: {
          created_at: string | null
          display_name: string
          local_part: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          local_part: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          local_part?: string
          user_id?: string
        }
        Relationships: []
      }
      sf_settings: {
        Row: {
          auto_sync_peppol: boolean | null
          created_at: string | null
          default_purchase_journal_code: string | null
          default_sale_journal_code: string | null
          default_vat_expense_account: string | null
          default_vat_income_account: string | null
          id: string
          require_siret_validation: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync_peppol?: boolean | null
          created_at?: string | null
          default_purchase_journal_code?: string | null
          default_sale_journal_code?: string | null
          default_vat_expense_account?: string | null
          default_vat_income_account?: string | null
          id?: string
          require_siret_validation?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          auto_sync_peppol?: boolean | null
          created_at?: string | null
          default_purchase_journal_code?: string | null
          default_sale_journal_code?: string | null
          default_vat_expense_account?: string | null
          default_vat_income_account?: string | null
          id?: string
          require_siret_validation?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sf_transmissions: {
        Row: {
          created_at: string | null
          direction: string | null
          error_log: string | null
          id: string
          odoo_move_id: number | null
          odoo_name: string | null
          payload_preview: Json | null
          peppol_message_id: string | null
          peppol_status: string | null
          source_app: string
          source_doc_id: string
          source_doc_ref: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          error_log?: string | null
          id?: string
          odoo_move_id?: number | null
          odoo_name?: string | null
          payload_preview?: Json | null
          peppol_message_id?: string | null
          peppol_status?: string | null
          source_app: string
          source_doc_id: string
          source_doc_ref: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          error_log?: string | null
          id?: string
          odoo_move_id?: number | null
          odoo_name?: string | null
          payload_preview?: Json | null
          peppol_message_id?: string | null
          peppol_status?: string | null
          source_app?: string
          source_doc_id?: string
          source_doc_ref?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
          entry_date?: string
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
            foreignKeyName: "skc_accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_accounting_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id"]
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
          line_number: number
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
            foreignKeyName: "skc_accounting_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_accounting_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_accounting_entry_lines_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "skc_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_accounting_entry_lines_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "skc_tax_rates"
            referencedColumns: ["id"]
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
            foreignKeyName: "skc_bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_bank_accounts_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id"]
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
            foreignKeyName: "skc_bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "skc_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_bank_transactions_matched_entry_line_id_fkey"
            columns: ["matched_entry_line_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entry_lines"
            referencedColumns: ["id"]
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
          account_type?: string
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
            foreignKeyName: "skc_chart_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_chart_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
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
          role?: string
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
            foreignKeyName: "skc_company_memberships_company_id_fkey"
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
            foreignKeyName: "skc_contacts_company_id_fkey"
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
            foreignKeyName: "skc_fiscal_periods_company_id_fkey"
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
          issue_date?: string
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
            foreignKeyName: "skc_invoice_documents_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "skc_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_documents_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "skc_journals"
            referencedColumns: ["id"]
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
          line_number: number
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
            foreignKeyName: "skc_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "skc_invoice_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_invoice_lines_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "skc_tax_rates"
            referencedColumns: ["id"]
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
            foreignKeyName: "skc_journals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_journals_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
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
          payment_date?: string
          payment_method?: string
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
            foreignKeyName: "skc_payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "skc_accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "skc_invoice_documents"
            referencedColumns: ["id"]
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
          rate_percent?: number
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
            foreignKeyName: "skc_tax_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "skc_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skc_tax_rates_tax_account_id_fkey"
            columns: ["tax_account_id"]
            isOneToOne: false
            referencedRelation: "skc_chart_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      skycloud_activities: {
        Row: {
          action: string
          created_at: string | null
          file_name: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          file_name?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          file_name?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      skycloud_files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          encrypted: boolean | null
          favorite: boolean | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          size: number | null
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          encrypted?: boolean | null
          favorite?: boolean | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size?: number | null
          storage_path: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          encrypted?: boolean | null
          favorite?: boolean | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size?: number | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skycloud_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "skycloud_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      skycloud_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      skycloud_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_id: string
          id: string
          permission: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_id: string
          id?: string
          permission?: string | null
          token: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_id?: string
          id?: string
          permission?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skycloud_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "skycloud_files"
            referencedColumns: ["id"]
          },
        ]
      }
      skydoc_documents: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      skydoc_messages: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          id?: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skydoc_messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "skydoc_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      skytab_sheets: {
        Row: {
          created_at: string | null
          current_index: number | null
          data_text: string | null
          history: Json | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_index?: number | null
          data_text?: string | null
          history?: Json | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          current_index?: number | null
          data_text?: string | null
          history?: Json | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skytask_lists: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      skytask_notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          pinned: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skytask_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          id: string
          list_id: string | null
          priority: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          list_id?: string | null
          priority?: string | null
          status?: string | null
          title: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          list_id?: string | null
          priority?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skytask_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "skytask_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      skytask_user_settings: {
        Row: {
          accent: string | null
          compact: boolean | null
          daily_goal: number | null
          display_name: string | null
          notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent?: string | null
          compact?: boolean | null
          daily_goal?: number | null
          display_name?: string | null
          notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          accent?: string | null
          compact?: boolean | null
          daily_goal?: number | null
          display_name?: string | null
          notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sp_assets: {
        Row: {
          category: string
          created_at: string
          id: string
          leonardo_init_image_id: string | null
          metadata: Json
          name: string
          public_url: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          leonardo_init_image_id?: string | null
          metadata?: Json
          name: string
          public_url?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          leonardo_init_image_id?: string | null
          metadata?: Json
          name?: string
          public_url?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sp_brand_kits: {
        Row: {
          brand_essence: string
          color_language: string
          composition_rules: string
          created_at: string
          editorial_line: string
          forbidden_elements: string
          id: string
          is_active: boolean
          lighting_signature: string
          mood_keywords: string
          name: string
          negative_prompt: string
          palette: Json
          reference_notes: string
          target_audience: string
          texture_materials: string
          tone_of_voice: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_essence?: string
          color_language?: string
          composition_rules?: string
          created_at?: string
          editorial_line?: string
          forbidden_elements?: string
          id?: string
          is_active?: boolean
          lighting_signature?: string
          mood_keywords?: string
          name?: string
          negative_prompt?: string
          palette?: Json
          reference_notes?: string
          target_audience?: string
          texture_materials?: string
          tone_of_voice?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_essence?: string
          color_language?: string
          composition_rules?: string
          created_at?: string
          editorial_line?: string
          forbidden_elements?: string
          id?: string
          is_active?: boolean
          lighting_signature?: string
          mood_keywords?: string
          name?: string
          negative_prompt?: string
          palette?: Json
          reference_notes?: string
          target_audience?: string
          texture_materials?: string
          tone_of_voice?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sp_drive_accounts: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          auto_enabled: boolean
          auto_settings: Json
          created_at: string
          google_email: string | null
          last_checked_at: string | null
          last_error: string | null
          output_folder_id: string | null
          output_folder_name: string | null
          refresh_token: string
          updated_at: string
          user_id: string
          watch_folder_id: string | null
          watch_folder_name: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          auto_enabled?: boolean
          auto_settings?: Json
          created_at?: string
          google_email?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          output_folder_id?: string | null
          output_folder_name?: string | null
          refresh_token: string
          updated_at?: string
          user_id: string
          watch_folder_id?: string | null
          watch_folder_name?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          auto_enabled?: boolean
          auto_settings?: Json
          created_at?: string
          google_email?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          output_folder_id?: string | null
          output_folder_name?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
          watch_folder_id?: string | null
          watch_folder_name?: string | null
        }
        Relationships: []
      }
      sp_drive_imports: {
        Row: {
          created_at: string
          error: string | null
          file_id: string
          file_name: string | null
          id: string
          shoot_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          file_id: string
          file_name?: string | null
          id?: string
          shoot_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          file_id?: string
          file_name?: string | null
          id?: string
          shoot_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_drive_imports_shoot_id_fkey"
            columns: ["shoot_id"]
            isOneToOne: false
            referencedRelation: "sp_shoots"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_generations: {
        Row: {
          asset_id: string | null
          brand_kit_id: string | null
          camera: Json
          created_at: string
          engine: string
          error: string | null
          final_prompt: string
          id: string
          images: Json
          is_favorite: boolean
          model_id: string | null
          negative_prompt: string
          params: Json
          provider_generation_id: string | null
          scene_brief: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          brand_kit_id?: string | null
          camera?: Json
          created_at?: string
          engine?: string
          error?: string | null
          final_prompt?: string
          id?: string
          images?: Json
          is_favorite?: boolean
          model_id?: string | null
          negative_prompt?: string
          params?: Json
          provider_generation_id?: string | null
          scene_brief?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          brand_kit_id?: string | null
          camera?: Json
          created_at?: string
          engine?: string
          error?: string | null
          final_prompt?: string
          id?: string
          images?: Json
          is_favorite?: boolean
          model_id?: string | null
          negative_prompt?: string
          params?: Json
          provider_generation_id?: string | null
          scene_brief?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "sp_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_generations_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "sp_brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_oauth_states: {
        Row: {
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      sp_settings: {
        Row: {
          created_at: string
          default_engine: string
          default_model_id: string | null
          leonardo_api_key: string | null
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_engine?: string
          default_model_id?: string | null
          leonardo_api_key?: string | null
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_engine?: string
          default_model_id?: string | null
          leonardo_api_key?: string | null
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sp_shoots: {
        Row: {
          analysis: Json | null
          created_at: string
          drive_upload_status: string | null
          id: string
          origin: string
          product_name: string
          settings: Json
          source_path: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          drive_upload_status?: string | null
          id?: string
          origin?: string
          product_name?: string
          settings?: Json
          source_path: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          drive_upload_status?: string | null
          id?: string
          origin?: string
          product_name?: string
          settings?: Json
          source_path?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sp_shots: {
        Row: {
          created_at: string
          error: string | null
          id: string
          image_path: string | null
          intent: string
          position: number
          prompt: string
          shoot_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          intent?: string
          position: number
          prompt?: string
          shoot_id: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          intent?: string
          position?: number
          prompt?: string
          shoot_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_shots_shoot_id_fkey"
            columns: ["shoot_id"]
            isOneToOne: false
            referencedRelation: "sp_shoots"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_style_presets: {
        Row: {
          brand_kit_id: string | null
          config: Json
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          config?: Json
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_kit_id?: string | null
          config?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_style_presets_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "sp_brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      st_agents: {
        Row: {
          color: string
          created_at: string
          department: string
          id: string
          is_chief: boolean
          lab_apps: string[]
          model: string
          name: string
          pos_x: number
          pos_y: number
          role: string
          skills: string
          status: string
          system_prompt: string
          team_id: string | null
          temperature: number
          tone: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          department: string
          id?: string
          is_chief?: boolean
          lab_apps?: string[]
          model?: string
          name: string
          pos_x?: number
          pos_y?: number
          role: string
          skills?: string
          status?: string
          system_prompt?: string
          team_id?: string | null
          temperature?: number
          tone?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          department?: string
          id?: string
          is_chief?: boolean
          lab_apps?: string[]
          model?: string
          name?: string
          pos_x?: number
          pos_y?: number
          role?: string
          skills?: string
          status?: string
          system_prompt?: string
          team_id?: string | null
          temperature?: number
          tone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "st_agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "st_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      st_custom_departments: {
        Row: {
          blurb: string
          created_at: string
          default_team: string
          id: string
          key: string
          label: string
          user_id: string
        }
        Insert: {
          blurb?: string
          created_at?: string
          default_team?: string
          id?: string
          key: string
          label: string
          user_id?: string
        }
        Update: {
          blurb?: string
          created_at?: string
          default_team?: string
          id?: string
          key?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      st_department_modules: {
        Row: {
          created_at: string
          department: string
          id: string
          modules: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          modules?: string[]
          user_id?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          modules?: string[]
          user_id?: string
        }
        Relationships: []
      }
      st_missions: {
        Row: {
          created_at: string
          id: string
          objective: string
          status: string
          summary: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective: string
          status?: string
          summary?: string | null
          team_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          objective?: string
          status?: string
          summary?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "st_missions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "st_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      st_tasks: {
        Row: {
          agent_id: string | null
          brief: string
          created_at: string
          id: string
          mission_id: string | null
          result: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          brief?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          result?: string | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_id?: string | null
          brief?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          result?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "st_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "st_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "st_tasks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "st_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "st_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "st_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      st_teams: {
        Row: {
          created_at: string
          department: string
          id: string
          mission: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          mission?: string | null
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          mission?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      sv_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          document_id: string | null
          event: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          event: string
          id?: never
          user_id?: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          event?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sv_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sv_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sv_contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          kind: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          siret: string | null
          tags: string | null
          user_id: string
          vat_number: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          kind?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          siret?: string | null
          tags?: string | null
          user_id?: string
          vat_number?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          kind?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          siret?: string | null
          tags?: string | null
          user_id?: string
          vat_number?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      sv_doc_counters: {
        Row: {
          type: string
          user_id: string
          value: number | null
          year: number
        }
        Insert: {
          type: string
          user_id?: string
          value?: number | null
          year: number
        }
        Update: {
          type?: string
          user_id?: string
          value?: number | null
          year?: number
        }
        Relationships: []
      }
      sv_documents: {
        Row: {
          accounting_entry_id: string | null
          client: Json | null
          contact_id: string | null
          created_at: string | null
          credited_id: string | null
          due_date: string | null
          finalized_at: string | null
          global_discount: number | null
          hash: string | null
          history: Json | null
          id: string
          intro: string | null
          issue_date: string | null
          items: Json | null
          notes: string | null
          number: string | null
          parent_id: string | null
          provider_signature: Json | null
          root_id: string | null
          service_date: string | null
          sign_token: string | null
          signature: Json | null
          status: string | null
          terms: string | null
          title: string | null
          total_ht: number | null
          total_ttc: number | null
          total_vat: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accounting_entry_id?: string | null
          client?: Json | null
          contact_id?: string | null
          created_at?: string | null
          credited_id?: string | null
          due_date?: string | null
          finalized_at?: string | null
          global_discount?: number | null
          hash?: string | null
          history?: Json | null
          id?: string
          intro?: string | null
          issue_date?: string | null
          items?: Json | null
          notes?: string | null
          number?: string | null
          parent_id?: string | null
          provider_signature?: Json | null
          root_id?: string | null
          service_date?: string | null
          sign_token?: string | null
          signature?: Json | null
          status?: string | null
          terms?: string | null
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          accounting_entry_id?: string | null
          client?: Json | null
          contact_id?: string | null
          created_at?: string | null
          credited_id?: string | null
          due_date?: string | null
          finalized_at?: string | null
          global_discount?: number | null
          hash?: string | null
          history?: Json | null
          id?: string
          intro?: string | null
          issue_date?: string | null
          items?: Json | null
          notes?: string | null
          number?: string | null
          parent_id?: string | null
          provider_signature?: Json | null
          root_id?: string | null
          service_date?: string | null
          sign_token?: string | null
          signature?: Json | null
          status?: string | null
          terms?: string | null
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          total_vat?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sv_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "sv_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_documents_credited_id_fkey"
            columns: ["credited_id"]
            isOneToOne: false
            referencedRelation: "sv_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sv_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sv_documents_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "sv_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sv_payments: {
        Row: {
          amount: number
          created_at: string | null
          document_id: string
          id: string
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          document_id: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          document_id?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sv_payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "sv_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sv_services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          name: string
          unit: string | null
          unit_price: number | null
          user_id: string
          vat_rate: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          name: string
          unit?: string | null
          unit_price?: number | null
          user_id?: string
          vat_rate?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          name?: string
          unit?: string | null
          unit_price?: number | null
          user_id?: string
          vat_rate?: number | null
        }
        Relationships: []
      }
      sv_settings: {
        Row: {
          data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tep_agents: {
        Row: {
          color: string
          created_at: string
          department: string
          id: string
          is_chief: boolean
          model: string
          name: string
          pos_x: number
          pos_y: number
          project_id: string | null
          role: string
          skills: string
          status: string
          system_prompt: string
          team_id: string | null
          temperature: number
          tone: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          department: string
          id?: string
          is_chief?: boolean
          model?: string
          name: string
          pos_x?: number
          pos_y?: number
          project_id?: string | null
          role: string
          skills?: string
          status?: string
          system_prompt?: string
          team_id?: string | null
          temperature?: number
          tone?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          department?: string
          id?: string
          is_chief?: boolean
          model?: string
          name?: string
          pos_x?: number
          pos_y?: number
          project_id?: string | null
          role?: string
          skills?: string
          status?: string
          system_prompt?: string
          team_id?: string | null
          temperature?: number
          tone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tep_agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tep_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_board_items: {
        Row: {
          ai_result: string | null
          color: string
          content: string
          created_at: string
          done: boolean
          due_at: string | null
          end_at: string | null
          google_event_id: string | null
          google_task_id: string | null
          h: number
          id: string
          kind: string
          mail_sent_at: string | null
          mail_subject: string | null
          mail_to: string | null
          project_id: string | null
          updated_at: string
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          ai_result?: string | null
          color?: string
          content?: string
          created_at?: string
          done?: boolean
          due_at?: string | null
          end_at?: string | null
          google_event_id?: string | null
          google_task_id?: string | null
          h?: number
          id?: string
          kind: string
          mail_sent_at?: string | null
          mail_subject?: string | null
          mail_to?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          ai_result?: string | null
          color?: string
          content?: string
          created_at?: string
          done?: boolean
          due_at?: string | null
          end_at?: string | null
          google_event_id?: string | null
          google_task_id?: string | null
          h?: number
          id?: string
          kind?: string
          mail_sent_at?: string | null
          mail_subject?: string | null
          mail_to?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_board_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_boards: {
        Row: {
          created_at: string
          id: string
          problem: string
          progress: number
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem?: string
          progress?: number
          project_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          problem?: string
          progress?: number
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_brands: {
        Row: {
          audience: string
          created_at: string
          description: string
          font: string
          hashtags: string
          id: string
          name: string
          pillars: string
          primary_color: string
          project_id: string | null
          secondary_color: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string
          font?: string
          hashtags?: string
          id?: string
          name: string
          pillars?: string
          primary_color?: string
          project_id?: string | null
          secondary_color?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string
          font?: string
          hashtags?: string
          id?: string
          name?: string
          pillars?: string
          primary_color?: string
          project_id?: string | null
          secondary_color?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_brands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_bubbles: {
        Row: {
          board_id: string
          content: string
          created_at: string
          done: boolean
          id: string
          kind: string
          mission: string
          objective: string
          status: string
          title: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          board_id: string
          content?: string
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          mission?: string
          objective?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Update: {
          board_id?: string
          content?: string
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          mission?: string
          objective?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_bubbles_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "tep_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_cards: {
        Row: {
          body: string
          color: string
          created_at: string
          data: Json
          h: number
          id: string
          parent_id: string | null
          project_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          body?: string
          color?: string
          created_at?: string
          data?: Json
          h?: number
          id?: string
          parent_id?: string | null
          project_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          body?: string
          color?: string
          created_at?: string
          data?: Json
          h?: number
          id?: string
          parent_id?: string | null
          project_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_content_boards: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_content_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_content_notes: {
        Row: {
          board_id: string
          body: string
          caption: string
          color: string
          created_at: string
          data: Json
          hashtags: string
          height: number
          id: string
          image_url: string | null
          kind: string
          network: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          width: number
          x: number
          y: number
        }
        Insert: {
          board_id: string
          body?: string
          caption?: string
          color?: string
          created_at?: string
          data?: Json
          hashtags?: string
          height?: number
          id?: string
          image_url?: string | null
          kind?: string
          network?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          board_id?: string
          body?: string
          caption?: string
          color?: string
          created_at?: string
          data?: Json
          hashtags?: string
          height?: number
          id?: string
          image_url?: string | null
          kind?: string
          network?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_content_notes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "tep_content_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_custom_departments: {
        Row: {
          blurb: string
          created_at: string
          default_team: string
          id: string
          key: string
          label: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          blurb?: string
          created_at?: string
          default_team?: string
          id?: string
          key: string
          label: string
          project_id?: string | null
          user_id?: string
        }
        Update: {
          blurb?: string
          created_at?: string
          default_team?: string
          id?: string
          key?: string
          label?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_custom_departments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_department_modules: {
        Row: {
          created_at: string
          department: string
          id: string
          modules: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          modules?: string[]
          user_id?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          modules?: string[]
          user_id?: string
        }
        Relationships: []
      }
      tep_google_connections: {
        Row: {
          created_at: string
          google_email: string | null
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_email?: string | null
          refresh_token: string
          scope: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          google_email?: string | null
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_google_oauth_states: {
        Row: {
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state: string
          user_id?: string
        }
        Update: {
          created_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_links: {
        Row: {
          created_at: string
          id: string
          label: string
          project_id: string | null
          source_id: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          project_id?: string | null
          source_id: string
          target_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          project_id?: string | null
          source_id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_missions: {
        Row: {
          created_at: string
          id: string
          objective: string
          status: string
          summary: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objective: string
          status?: string
          summary?: string | null
          team_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          objective?: string
          status?: string
          summary?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_missions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tep_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          data: Json
          h: number
          id: string
          parent_id: string | null
          project_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          data?: Json
          h?: number
          id?: string
          parent_id?: string | null
          project_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          data?: Json
          h?: number
          id?: string
          parent_id?: string | null
          project_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_odoo_connections: {
        Row: {
          api_key: string
          connected: boolean
          created_at: string
          database: string
          id: string
          uid: number | null
          url: string
          user_id: string
          username: string
        }
        Insert: {
          api_key: string
          connected?: boolean
          created_at?: string
          database: string
          id?: string
          uid?: number | null
          url: string
          user_id?: string
          username: string
        }
        Update: {
          api_key?: string
          connected?: boolean
          created_at?: string
          database?: string
          id?: string
          uid?: number | null
          url?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      tep_planning_google_connections: {
        Row: {
          access_token_ciphertext: string | null
          access_token_expires_at: string | null
          created_at: string
          google_email: string | null
          refresh_token_ciphertext: string
          scopes: string
          tasklist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token_ciphertext: string
          scopes: string
          tasklist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token_ciphertext?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          google_email?: string | null
          refresh_token_ciphertext?: string
          scopes?: string
          tasklist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_planning_google_oauth_states: {
        Row: {
          created_at: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          redirect_uri: string
          state: string
          user_id?: string
        }
        Update: {
          created_at?: string
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_projects: {
        Row: {
          board_type: string
          created_at: string
          id: string
          parent_board_id: string | null
          ref_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board_type?: string
          created_at?: string
          id?: string
          parent_board_id?: string | null
          ref_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          board_type?: string
          created_at?: string
          id?: string
          parent_board_id?: string | null
          ref_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_sketch_boards: {
        Row: {
          created_at: string
          elements: Json
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elements?: Json
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          elements?: Json
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tep_stickies: {
        Row: {
          color: string
          content: string
          created_at: string
          day: string
          done: boolean
          duration_min: number | null
          email_sent: boolean
          email_to: string | null
          google_id: string | null
          google_list_id: string | null
          id: string
          kind: string
          project_id: string | null
          start_time: string | null
          synced_at: string | null
          title: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          day: string
          done?: boolean
          duration_min?: number | null
          email_sent?: boolean
          email_to?: string | null
          google_id?: string | null
          google_list_id?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          start_time?: string | null
          synced_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          day?: string
          done?: boolean
          duration_min?: number | null
          email_sent?: boolean
          email_to?: string | null
          google_id?: string | null
          google_list_id?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          start_time?: string | null
          synced_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tep_stickies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_tasks: {
        Row: {
          agent_id: string | null
          brief: string
          created_at: string
          id: string
          mission_id: string | null
          result: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          brief?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          result?: string | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          agent_id?: string | null
          brief?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          result?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "tep_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tep_tasks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "tep_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tep_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tep_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_teams: {
        Row: {
          created_at: string
          department: string
          id: string
          mission: string | null
          name: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          mission?: string | null
          name: string
          project_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          mission?: string | null
          name?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tep_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tep_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tep_user_settings: {
        Row: {
          ai_model: string
          board_theme: string
          created_at: string
          default_calendar_id: string
          default_tasklist_id: string | null
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          board_theme?: string
          created_at?: string
          default_calendar_id?: string
          default_tasklist_id?: string | null
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_model?: string
          board_theme?: string
          created_at?: string
          default_calendar_id?: string
          default_tasklist_id?: string | null
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ui_preferences: {
        Row: {
          background_opacity: number
          background_url: string | null
          created_at: string
          sidebar_collapsed: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_opacity?: number
          background_url?: string | null
          created_at?: string
          sidebar_collapsed?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          background_opacity?: number
          background_url?: string | null
          created_at?: string
          sidebar_collapsed?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          created_at: string
          gemini_key: string | null
          openai_key: string | null
          preferred_provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gemini_key?: string | null
          openai_key?: string | null
          preferred_provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          gemini_key?: string | null
          openai_key?: string | null
          preferred_provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_app_models: {
        Row: {
          app_key: string
          created_at: string
          id: string
          model_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_key: string
          created_at?: string
          id?: string
          model_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          app_key?: string
          created_at?: string
          id?: string
          model_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_model: string
          chat_memory_size: number
          created_at: string
          email_greeting: string
          email_signature: string
          email_tone: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          chat_memory_size?: number
          created_at?: string
          email_greeting?: string
          email_signature?: string
          email_tone?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_model?: string
          chat_memory_size?: number
          created_at?: string
          email_greeting?: string
          email_signature?: string
          email_tone?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      gmail_connection_status: {
        Row: {
          expires_at: string | null
          google_email: string | null
          scopes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          google_email?: string | null
          scopes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          google_email?: string | null
          scopes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      angelo_init_user: { Args: { _uid: string }; Returns: undefined }
      is_address_available: { Args: { _local: string }; Returns: boolean }
      meets_mfa_requirement: { Args: never; Returns: boolean }
      noject_recompute_project_progress: {
        Args: { _project_id: string }
        Returns: undefined
      }
      pst_get_public_agent: {
        Args: { _id: string }
        Returns: {
          assistant_name: string
          company: string
          id: string
          name: string
        }[]
      }
      skc_add_company_member: {
        Args: { p_company_id: string; p_email: string; p_role: string }
        Returns: undefined
      }
      skc_has_company_role: {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      skc_init_company_defaults: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      skc_is_company_creator: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      skc_is_company_member: {
        Args: { p_company_id: string }
        Returns: boolean
      }
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
      sv_create_credit_note: {
        Args: { p_invoice: string }
        Returns: {
          accounting_entry_id: string | null
          client: Json | null
          contact_id: string | null
          created_at: string | null
          credited_id: string | null
          due_date: string | null
          finalized_at: string | null
          global_discount: number | null
          hash: string | null
          history: Json | null
          id: string
          intro: string | null
          issue_date: string | null
          items: Json | null
          notes: string | null
          number: string | null
          parent_id: string | null
          provider_signature: Json | null
          root_id: string | null
          service_date: string | null
          sign_token: string | null
          signature: Json | null
          status: string | null
          terms: string | null
          title: string | null
          total_ht: number | null
          total_ttc: number | null
          total_vat: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sv_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sv_doc_fingerprint: {
        Args: { d: Database["public"]["Tables"]["sv_documents"]["Row"] }
        Returns: string
      }
      sv_finalize_invoice: {
        Args: { p_id: string }
        Returns: {
          accounting_entry_id: string | null
          client: Json | null
          contact_id: string | null
          created_at: string | null
          credited_id: string | null
          due_date: string | null
          finalized_at: string | null
          global_discount: number | null
          hash: string | null
          history: Json | null
          id: string
          intro: string | null
          issue_date: string | null
          items: Json | null
          notes: string | null
          number: string | null
          parent_id: string | null
          provider_signature: Json | null
          root_id: string | null
          service_date: string | null
          sign_token: string | null
          signature: Json | null
          status: string | null
          terms: string | null
          title: string | null
          total_ht: number | null
          total_ttc: number | null
          total_vat: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sv_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sv_get_public_document: { Args: { p_token: string }; Returns: Json }
      sv_next_doc_number: { Args: { p_type: string }; Returns: string }
      sv_refuse_public_document: { Args: { p_token: string }; Returns: Json }
      sv_register_payment: {
        Args: {
          p_amount: number
          p_date: string
          p_document_id: string
          p_method: string
          p_reference?: string
        }
        Returns: Json
      }
      sv_sign_public_document: {
        Args: {
          p_consent?: boolean
          p_image: string
          p_name: string
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: {
      automation_status: "draft" | "active" | "paused"
      eco_action_type: "operation" | "decision" | "automated_agent" | "event"
      eco_color_code: "value_add" | "bottleneck" | "automated" | "waiting_time"
      eco_message_role: "user" | "assistant" | "system"
      eco_mission_status:
        | "draft"
        | "clarifying"
        | "reengineering"
        | "round_up_ready"
        | "completed"
      execution_status: "pending" | "running" | "success" | "error"
      noject_project_phase:
        | "lancement"
        | "planification"
        | "execution"
        | "cloture"
      noject_project_status: "actif" | "en_pause" | "termine" | "archive"
      noject_task_priority: "basse" | "moyenne" | "haute" | "critique"
      noject_task_status:
        | "a_faire"
        | "en_cours"
        | "en_revue"
        | "termine"
        | "bloque"
      psc_agent_run_kind: "scan_sheet" | "first_outreach" | "reply" | "followup"
      psc_agent_run_status: "success" | "error" | "skipped"
      psc_message_role: "pascal" | "prospect" | "system"
      psc_prospect_status:
        | "new"
        | "contacted"
        | "replied"
        | "meeting_booked"
        | "lost"
        | "paused"
      sa_contact_kind: "client" | "fournisseur" | "both"
      sa_doc_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "paid"
        | "signed"
        | "cancelled"
        | "approved"
        | "disputed"
      sa_doc_type: "quote" | "order" | "invoice" | "delivery" | "credit_note"
      sa_product_kind: "bien" | "service"
      trigger_type: "cron" | "new_email" | "new_event" | "new_task"
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
    Enums: {
      automation_status: ["draft", "active", "paused"],
      eco_action_type: ["operation", "decision", "automated_agent", "event"],
      eco_color_code: ["value_add", "bottleneck", "automated", "waiting_time"],
      eco_message_role: ["user", "assistant", "system"],
      eco_mission_status: [
        "draft",
        "clarifying",
        "reengineering",
        "round_up_ready",
        "completed",
      ],
      execution_status: ["pending", "running", "success", "error"],
      noject_project_phase: [
        "lancement",
        "planification",
        "execution",
        "cloture",
      ],
      noject_project_status: ["actif", "en_pause", "termine", "archive"],
      noject_task_priority: ["basse", "moyenne", "haute", "critique"],
      noject_task_status: [
        "a_faire",
        "en_cours",
        "en_revue",
        "termine",
        "bloque",
      ],
      psc_agent_run_kind: ["scan_sheet", "first_outreach", "reply", "followup"],
      psc_agent_run_status: ["success", "error", "skipped"],
      psc_message_role: ["pascal", "prospect", "system"],
      psc_prospect_status: [
        "new",
        "contacted",
        "replied",
        "meeting_booked",
        "lost",
        "paused",
      ],
      sa_contact_kind: ["client", "fournisseur", "both"],
      sa_doc_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "paid",
        "signed",
        "cancelled",
        "approved",
        "disputed",
      ],
      sa_doc_type: ["quote", "order", "invoice", "delivery", "credit_note"],
      sa_product_kind: ["bien", "service"],
      trigger_type: ["cron", "new_email", "new_event", "new_task"],
    },
  },
} as const
