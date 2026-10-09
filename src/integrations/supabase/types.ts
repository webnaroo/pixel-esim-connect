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
      api_logs: {
        Row: {
          created_at: string
          endpoint: string
          error: string | null
          id: string
          latency_ms: number | null
          provider: string
          status: number | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          provider: string
          status?: number | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          provider?: string
          status?: number | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      blog_post_versions: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          post_id: string
          snapshot: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          snapshot: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          answer_summary: string | null
          author_name: string | null
          body_md: string
          country_code: string | null
          cover_image_alt: string | null
          cover_url: string | null
          created_at: string
          faq: Json
          focus_keyword: string | null
          generation_meta: Json | null
          id: string
          internal_links: Json
          meta_description: string | null
          meta_title: string | null
          post_type: string
          published_at: string | null
          quality_report: Json | null
          quality_score: number | null
          scheduled_at: string | null
          score_override_reason: string | null
          sections: Json
          seo: Json | null
          slug: string
          sources: Json
          status: string
          target_words: number
          title: string
          updated_at: string
        }
        Insert: {
          answer_summary?: string | null
          author_name?: string | null
          body_md?: string
          country_code?: string | null
          cover_image_alt?: string | null
          cover_url?: string | null
          created_at?: string
          faq?: Json
          focus_keyword?: string | null
          generation_meta?: Json | null
          id?: string
          internal_links?: Json
          meta_description?: string | null
          meta_title?: string | null
          post_type?: string
          published_at?: string | null
          quality_report?: Json | null
          quality_score?: number | null
          scheduled_at?: string | null
          score_override_reason?: string | null
          sections?: Json
          seo?: Json | null
          slug: string
          sources?: Json
          status?: string
          target_words?: number
          title: string
          updated_at?: string
        }
        Update: {
          answer_summary?: string | null
          author_name?: string | null
          body_md?: string
          country_code?: string | null
          cover_image_alt?: string | null
          cover_url?: string | null
          created_at?: string
          faq?: Json
          focus_keyword?: string | null
          generation_meta?: Json | null
          id?: string
          internal_links?: Json
          meta_description?: string | null
          meta_title?: string | null
          post_type?: string
          published_at?: string | null
          quality_report?: Json | null
          quality_score?: number | null
          scheduled_at?: string | null
          score_override_reason?: string | null
          sections?: Json
          seo?: Json | null
          slug?: string
          sources?: Json
          status?: string
          target_words?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      comparison_facts: {
        Row: {
          checked_at: string
          competitor_id: string
          created_at: string
          enabled: boolean
          id: string
          row_id: string
          source_url: string
          status: string
          text: string
        }
        Insert: {
          checked_at?: string
          competitor_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          row_id: string
          source_url: string
          status?: string
          text: string
        }
        Update: {
          checked_at?: string
          competitor_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          row_id?: string
          source_url?: string
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparison_facts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparison_facts_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "comparison_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_rows: {
        Row: {
          created_at: string
          enabled: boolean
          globesim_status: string
          globesim_text: string
          id: string
          question: string
          requires: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          globesim_status?: string
          globesim_text?: string
          id?: string
          question: string
          requires?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          globesim_status?: string
          globesim_text?: string
          id?: string
          question?: string
          requires?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      competitors: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          website_url: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          website_url?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          website_url?: string | null
        }
        Relationships: []
      }
      destination_countries: {
        Row: {
          country_id: string
          region_id: string
        }
        Insert: {
          country_id: string
          region_id: string
        }
        Update: {
          country_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_countries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          aliases: string[]
          continent: string | null
          created_at: string
          flag_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          iso_code: string | null
          name_de: string
          name_en: string
          provider_ref: Json | null
          slug: string
          sort_order: number
          type: Database["public"]["Enums"]["destination_type"]
        }
        Insert: {
          aliases?: string[]
          continent?: string | null
          created_at?: string
          flag_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          iso_code?: string | null
          name_de: string
          name_en: string
          provider_ref?: Json | null
          slug: string
          sort_order?: number
          type?: Database["public"]["Enums"]["destination_type"]
        }
        Update: {
          aliases?: string[]
          continent?: string | null
          created_at?: string
          flag_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          iso_code?: string | null
          name_de?: string
          name_en?: string
          provider_ref?: Json | null
          slug?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["destination_type"]
        }
        Relationships: []
      }
      destinations_content: {
        Row: {
          destination_id: string
          faq: Json | null
          intro: string | null
          network_info: Json | null
          seo_description: string | null
          seo_title: string | null
        }
        Insert: {
          destination_id: string
          faq?: Json | null
          intro?: string | null
          network_info?: Json | null
          seo_description?: string | null
          seo_title?: string | null
        }
        Update: {
          destination_id?: string
          faq?: Json | null
          intro?: string | null
          network_info?: Json | null
          seo_description?: string | null
          seo_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_content_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: true
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      esim_devices: {
        Row: {
          active: boolean
          checked_at: string
          created_at: string
          esim_supported: boolean
          id: string
          manufacturer: string
          model: string
          notes: string | null
          release_year: number | null
          source_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          checked_at: string
          created_at?: string
          esim_supported?: boolean
          id?: string
          manufacturer: string
          model: string
          notes?: string | null
          release_year?: number | null
          source_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          checked_at?: string
          created_at?: string
          esim_supported?: boolean
          id?: string
          manufacturer?: string
          model?: string
          notes?: string | null
          release_year?: number | null
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      esims: {
        Row: {
          activated_at: string | null
          activation_code: string | null
          android_install_url: string | null
          created_at: string
          direct_install_url: string | null
          expires_at: string | null
          iccid: string | null
          id: string
          install_status: string | null
          ios_install_url: string | null
          lpa_string: string | null
          order_id: string
          provider: string
          provider_esim_id: string | null
          provider_order_id: string | null
          provider_status: string | null
          qr_image_url: string | null
          smdp_address: string | null
          status: string
          updated_at: string
          usage_alerts_sent: number[]
          usage_cache: Json | null
          usage_checked_at: string | null
          usage_threshold: number | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_code?: string | null
          android_install_url?: string | null
          created_at?: string
          direct_install_url?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_status?: string | null
          ios_install_url?: string | null
          lpa_string?: string | null
          order_id: string
          provider?: string
          provider_esim_id?: string | null
          provider_order_id?: string | null
          provider_status?: string | null
          qr_image_url?: string | null
          smdp_address?: string | null
          status?: string
          updated_at?: string
          usage_alerts_sent?: number[]
          usage_cache?: Json | null
          usage_checked_at?: string | null
          usage_threshold?: number | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_code?: string | null
          android_install_url?: string | null
          created_at?: string
          direct_install_url?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_status?: string | null
          ios_install_url?: string | null
          lpa_string?: string | null
          order_id?: string
          provider?: string
          provider_esim_id?: string | null
          provider_order_id?: string | null
          provider_status?: string | null
          qr_image_url?: string | null
          smdp_address?: string | null
          status?: string
          updated_at?: string
          usage_alerts_sent?: number[]
          usage_cache?: Json | null
          usage_checked_at?: string | null
          usage_threshold?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          category?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          category?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          decided_by: string | null
          expires_at: string | null
          fetched_at: string
          from_currency: string
          id: string
          last_checked_at: string | null
          published_at: string | null
          rate: number
          reason: string | null
          source: string
          source_rate: number | null
          status: string
          to_currency: string
          valid_from: string
        }
        Insert: {
          decided_by?: string | null
          expires_at?: string | null
          fetched_at?: string
          from_currency: string
          id?: string
          last_checked_at?: string | null
          published_at?: string | null
          rate: number
          reason?: string | null
          source?: string
          source_rate?: number | null
          status?: string
          to_currency: string
          valid_from?: string
        }
        Update: {
          decided_by?: string | null
          expires_at?: string | null
          fetched_at?: string
          from_currency?: string
          id?: string
          last_checked_at?: string | null
          published_at?: string | null
          rate?: number
          reason?: string | null
          source?: string
          source_rate?: number | null
          status?: string
          to_currency?: string
          valid_from?: string
        }
        Relationships: []
      }
      internal_secrets: {
        Row: {
          created_at: string
          name: string
          value: string
        }
        Insert: {
          created_at?: string
          name: string
          value: string
        }
        Update: {
          created_at?: string
          name?: string
          value?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          body_md: string
          published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_md?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_md?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          anonymized_at: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          currency: string
          email_status: string
          fulfillment_attempts: number
          fx_rate: number | null
          guest_email: string
          id: string
          idempotency_key: string
          is_sandbox: boolean
          is_test: boolean
          last_error: string | null
          net: number | null
          next_attempt_at: string | null
          plan_id: string | null
          plan_snapshot: Json | null
          price_frozen_until: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_env: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax: number
          updated_at: string
          user_id: string | null
          withdrawal_consent_at: string | null
        }
        Insert: {
          amount: number
          anonymized_at?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          currency?: string
          email_status?: string
          fulfillment_attempts?: number
          fx_rate?: number | null
          guest_email: string
          id?: string
          idempotency_key?: string
          is_sandbox?: boolean
          is_test?: boolean
          last_error?: string | null
          net?: number | null
          next_attempt_at?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          price_frozen_until?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_env?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax?: number
          updated_at?: string
          user_id?: string | null
          withdrawal_consent_at?: string | null
        }
        Update: {
          amount?: number
          anonymized_at?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          currency?: string
          email_status?: string
          fulfillment_attempts?: number
          fx_rate?: number | null
          guest_email?: string
          id?: string
          idempotency_key?: string
          is_sandbox?: boolean
          is_test?: boolean
          last_error?: string | null
          net?: number | null
          next_attempt_at?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          price_frozen_until?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_env?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tax?: number
          updated_at?: string
          user_id?: string | null
          withdrawal_consent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "public_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          badge: string | null
          cost_currency: string
          cost_price: number
          created_at: string
          currency: string
          data_mb: number | null
          destination_id: string
          fair_use: Json | null
          hotspot: boolean | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          network_type: string | null
          networks: string[] | null
          provider: string
          provider_plan_id: string
          raw: Json | null
          sell_price: number
          throttle_claim: string
          throttle_confirmation: Json | null
          top_upable: boolean | null
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          validity_days: number
          voice_sms: Json | null
        }
        Insert: {
          badge?: string | null
          cost_currency: string
          cost_price: number
          created_at?: string
          currency?: string
          data_mb?: number | null
          destination_id: string
          fair_use?: Json | null
          hotspot?: boolean | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          network_type?: string | null
          networks?: string[] | null
          provider?: string
          provider_plan_id: string
          raw?: Json | null
          sell_price: number
          throttle_claim?: string
          throttle_confirmation?: Json | null
          top_upable?: boolean | null
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          validity_days: number
          voice_sms?: Json | null
        }
        Update: {
          badge?: string | null
          cost_currency?: string
          cost_price?: number
          created_at?: string
          currency?: string
          data_mb?: number | null
          destination_id?: string
          fair_use?: Json | null
          hotspot?: boolean | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          network_type?: string | null
          networks?: string[] | null
          provider?: string
          provider_plan_id?: string
          raw?: Json | null
          sell_price?: number
          throttle_claim?: string
          throttle_confirmation?: Json | null
          top_upable?: boolean | null
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          validity_days?: number
          voice_sms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          id: string
          priority: number
          rounding: string | null
          scope: string
          scope_ref: string | null
          type: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          rounding?: string | null
          scope?: string
          scope_ref?: string | null
          type?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          rounding?: string | null
          scope?: string
          scope_ref?: string | null
          type?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          locale: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          locale?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          locale?: string
          name?: string | null
        }
        Relationships: []
      }
      provider_raw_samples: {
        Row: {
          body_sanitized: Json | null
          created_at: string
          endpoint: string
          id: string
          status: number | null
        }
        Insert: {
          body_sanitized?: Json | null
          created_at?: string
          endpoint: string
          id?: string
          status?: number | null
        }
        Update: {
          body_sanitized?: Json | null
          created_at?: string
          endpoint?: string
          id?: string
          status?: number | null
        }
        Relationships: []
      }
      provider_webhook_events: {
        Row: {
          delivery_id: string | null
          error: string | null
          event_id: string
          event_type: string
          id: string
          mode: string
          order_id: string | null
          payload: Json | null
          processed_at: string | null
          received_at: string
          signature_valid: boolean
          status: string
        }
        Insert: {
          delivery_id?: string | null
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          mode: string
          order_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          signature_valid?: boolean
          status?: string
        }
        Update: {
          delivery_id?: string | null
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          mode?: string
          order_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      seo_ai_state: {
        Row: {
          blocked: boolean
          id: boolean
          reason: string | null
          status_code: number | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          id?: boolean
          reason?: string | null
          status_code?: number | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          id?: boolean
          reason?: string | null
          status_code?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_runs: {
        Row: {
          actor_id: string | null
          created_at: string
          error: string | null
          id: string
          input_report: string | null
          kind: string
          pages: string[]
          result: Json | null
          status: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_report?: string | null
          kind: string
          pages?: string[]
          result?: Json | null
          status?: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_report?: string | null
          kind?: string
          pages?: string[]
          result?: Json | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          order_id: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          order_id?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          order_id?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          countries: number
          error: string | null
          finished_at: string | null
          id: string
          plans_added: number
          plans_deactivated: number
          plans_updated: number
          started_at: string
          stats: Json | null
          status: string
          unmapped: Json
        }
        Insert: {
          countries?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          plans_added?: number
          plans_deactivated?: number
          plans_updated?: number
          started_at?: string
          stats?: Json | null
          status?: string
          unmapped?: Json
        }
        Update: {
          countries?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          plans_added?: number
          plans_deactivated?: number
          plans_updated?: number
          started_at?: string
          stats?: Json | null
          status?: string
          unmapped?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json | null
          processed_at: string | null
          source: Database["public"]["Enums"]["webhook_source"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          source: Database["public"]["Enums"]["webhook_source"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          source?: Database["public"]["Enums"]["webhook_source"]
        }
        Relationships: []
      }
    }
    Views: {
      destination_prices: {
        Row: {
          destination_id: string | null
          from_price: number | null
          has_data: boolean | null
          has_unlimited: boolean | null
          plan_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_plans: {
        Row: {
          badge: string | null
          currency: string | null
          data_mb: number | null
          destination_id: string | null
          fair_use: Json | null
          hotspot: boolean | null
          id: string | null
          network_type: string | null
          networks: string[] | null
          sell_price: number | null
          throttle_claim: string | null
          top_upable: boolean | null
          type: Database["public"]["Enums"]["plan_type"] | null
          updated_at: string | null
          validity_days: number | null
          voice_sms: Json | null
        }
        Insert: {
          badge?: string | null
          currency?: string | null
          data_mb?: number | null
          destination_id?: string | null
          fair_use?: Json | null
          hotspot?: boolean | null
          id?: string | null
          network_type?: string | null
          networks?: string[] | null
          sell_price?: number | null
          throttle_claim?: never
          top_upable?: boolean | null
          type?: Database["public"]["Enums"]["plan_type"] | null
          updated_at?: string | null
          validity_days?: number | null
          voice_sms?: Json | null
        }
        Update: {
          badge?: string | null
          currency?: string | null
          data_mb?: number | null
          destination_id?: string | null
          fair_use?: Json | null
          hotspot?: boolean | null
          id?: string | null
          network_type?: string | null
          networks?: string[] | null
          sell_price?: number | null
          throttle_claim?: never
          top_upable?: boolean | null
          type?: Database["public"]["Enums"]["plan_type"] | null
          updated_at?: string | null
          validity_days?: number | null
          voice_sms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      arm_fulfillment_retry: { Args: never; Returns: undefined }
      claim_order_for_fulfillment: {
        Args: { _max_attempts: number; _order_id: string }
        Returns: {
          amount: number
          anonymized_at: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          currency: string
          email_status: string
          fulfillment_attempts: number
          fx_rate: number | null
          guest_email: string
          id: string
          idempotency_key: string
          is_sandbox: boolean
          is_test: boolean
          last_error: string | null
          net: number | null
          next_attempt_at: string | null
          plan_id: string | null
          plan_snapshot: Json | null
          price_frozen_until: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_env: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tax: number
          updated_at: string
          user_id: string | null
          withdrawal_consent_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      disarm_fulfillment_retry_if_drained: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rate_limit_hit: {
        Args: { _bucket: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "support" | "user"
      destination_type: "country" | "region" | "global"
      order_status:
        | "pending"
        | "paid"
        | "fulfilling"
        | "fulfilled"
        | "fulfillment_failed"
        | "refunded"
        | "cancelled"
        | "payment_mismatch"
        | "needs_review"
      plan_type: "data" | "unlimited"
      webhook_source: "stripe" | "provider"
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
      app_role: ["admin", "support", "user"],
      destination_type: ["country", "region", "global"],
      order_status: [
        "pending",
        "paid",
        "fulfilling",
        "fulfilled",
        "fulfillment_failed",
        "refunded",
        "cancelled",
        "payment_mismatch",
        "needs_review",
      ],
      plan_type: ["data", "unlimited"],
      webhook_source: ["stripe", "provider"],
    },
  },
} as const
