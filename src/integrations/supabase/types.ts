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
      blog_posts: {
        Row: {
          body_md: string
          cover_url: string | null
          created_at: string
          id: string
          published_at: string | null
          seo: Json | null
          slug: string
          title: string
        }
        Insert: {
          body_md?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          seo?: Json | null
          slug: string
          title: string
        }
        Update: {
          body_md?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          seo?: Json | null
          slug?: string
          title?: string
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
      esims: {
        Row: {
          activation_code: string | null
          created_at: string
          direct_install_url: string | null
          expires_at: string | null
          iccid: string | null
          id: string
          install_status: string | null
          lpa_string: string | null
          order_id: string
          provider: string
          provider_order_id: string | null
          qr_image_url: string | null
          smdp_address: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activation_code?: string | null
          created_at?: string
          direct_install_url?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_status?: string | null
          lpa_string?: string | null
          order_id: string
          provider?: string
          provider_order_id?: string | null
          qr_image_url?: string | null
          smdp_address?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activation_code?: string | null
          created_at?: string
          direct_install_url?: string | null
          expires_at?: string | null
          iccid?: string | null
          id?: string
          install_status?: string | null
          lpa_string?: string | null
          order_id?: string
          provider?: string
          provider_order_id?: string | null
          qr_image_url?: string | null
          smdp_address?: string | null
          status?: string
          updated_at?: string
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
          from_currency: string
          id: string
          rate: number
          source: string
          to_currency: string
          valid_from: string
        }
        Insert: {
          from_currency: string
          id?: string
          rate: number
          source?: string
          to_currency: string
          valid_from?: string
        }
        Update: {
          from_currency?: string
          id?: string
          rate?: number
          source?: string
          to_currency?: string
          valid_from?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          fulfillment_attempts: number
          guest_email: string
          id: string
          idempotency_key: string
          last_error: string | null
          plan_id: string | null
          plan_snapshot: Json | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          tax: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          fulfillment_attempts?: number
          guest_email: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          tax?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          fulfillment_attempts?: number
          guest_email?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          plan_id?: string | null
          plan_snapshot?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          tax?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
          status: string
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
          status?: string
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
          status?: string
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
    }
    Functions: {
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
      ],
      plan_type: ["data", "unlimited"],
      webhook_source: ["stripe", "provider"],
    },
  },
} as const
