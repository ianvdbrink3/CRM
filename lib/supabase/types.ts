export type Database = {
  public: {
    Tables: {

      // ------------------------------------------------------------------ //
      // nucleus_suppliers
      // ------------------------------------------------------------------ //
      nucleus_suppliers: {
        Row: {
          id: string
          name: string
          status: string
          contact_person: string | null
          whatsapp: string | null
          skype: string | null
          email: string | null
          country: string | null
          shipping_days: number | null
          moq: number | null
          quality_score: number | null
          reliability_score: number | null
          payment_terms: string | null
          notes: string | null
          created_at: string
          /** generated */ readonly supplier_score: number | null
        }
        Insert: {
          id?: string
          name: string
          status?: string
          contact_person?: string | null
          whatsapp?: string | null
          skype?: string | null
          email?: string | null
          country?: string | null
          shipping_days?: number | null
          moq?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          contact_person?: string | null
          whatsapp?: string | null
          skype?: string | null
          email?: string | null
          country?: string | null
          shipping_days?: number | null
          moq?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          payment_terms?: string | null
          notes?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_products
      // ------------------------------------------------------------------ //
      nucleus_products: {
        Row: {
          id: string
          name: string
          product_url: string | null
          status: string
          category: string | null
          type: string | null
          supplier_id: string | null
          competitors: string[] | null
          cost_price: number | null
          sell_price: number | null
          shipping_cost: number | null
          test_budget: number | null
          research_date: string | null
          problem_solving: number | null
          wow_factor: number | null
          trending: number | null
          competition: number | null
          virality: number | null
          ugc_potential: number | null
          profitability: number | null
          created_at: string
          /** generated */ readonly margin_per_unit: number | null
          /** generated */ readonly margin_pct: number | null
          /** generated */ readonly winning_score: number | null
        }
        Insert: {
          id?: string
          name: string
          product_url?: string | null
          status?: string
          category?: string | null
          type?: string | null
          supplier_id?: string | null
          competitors?: string[] | null
          cost_price?: number | null
          sell_price?: number | null
          shipping_cost?: number | null
          test_budget?: number | null
          research_date?: string | null
          problem_solving?: number | null
          wow_factor?: number | null
          trending?: number | null
          competition?: number | null
          virality?: number | null
          ugc_potential?: number | null
          profitability?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          product_url?: string | null
          status?: string
          category?: string | null
          type?: string | null
          supplier_id?: string | null
          competitors?: string[] | null
          cost_price?: number | null
          sell_price?: number | null
          shipping_cost?: number | null
          test_budget?: number | null
          research_date?: string | null
          problem_solving?: number | null
          wow_factor?: number | null
          trending?: number | null
          competition?: number | null
          virality?: number | null
          ugc_potential?: number | null
          profitability?: number | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_campaigns
      // ------------------------------------------------------------------ //
      nucleus_campaigns: {
        Row: {
          id: string
          name: string
          product_id: string | null
          platform: string
          status: string
          budget: number | null
          ad_spend: number | null
          revenue: number | null
          orders: number | null
          start_date: string | null
          created_at: string
          /** generated */ readonly roas: number | null
          /** generated */ readonly cpa: number | null
          /** generated */ readonly result_after_spend: number | null
        }
        Insert: {
          id?: string
          name: string
          product_id?: string | null
          platform: string
          status?: string
          budget?: number | null
          ad_spend?: number | null
          revenue?: number | null
          orders?: number | null
          start_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          product_id?: string | null
          platform?: string
          status?: string
          budget?: number | null
          ad_spend?: number | null
          revenue?: number | null
          orders?: number | null
          start_date?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_creatives
      // ------------------------------------------------------------------ //
      nucleus_creatives: {
        Row: {
          id: string
          name: string
          product_id: string | null
          campaign_id: string | null
          status: string
          hook_type: string | null
          angle: string | null
          creator: string | null
          format: string | null
          platforms: string[] | null
          ai_generated: boolean | null
          disclosure_added: boolean | null
          asset_link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          product_id?: string | null
          campaign_id?: string | null
          status?: string
          hook_type?: string | null
          angle?: string | null
          creator?: string | null
          format?: string | null
          platforms?: string[] | null
          ai_generated?: boolean | null
          disclosure_added?: boolean | null
          asset_link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          product_id?: string | null
          campaign_id?: string | null
          status?: string
          hook_type?: string | null
          angle?: string | null
          creator?: string | null
          format?: string | null
          platforms?: string[] | null
          ai_generated?: boolean | null
          disclosure_added?: boolean | null
          asset_link?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_customer_insights
      // ------------------------------------------------------------------ //
      nucleus_customer_insights: {
        Row: {
          id: string
          title: string
          type: string
          product_id: string | null
          source: string | null
          sentiment: string | null
          content: string | null
          usable_for: string | null
          processed: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          type: string
          product_id?: string | null
          source?: string | null
          sentiment?: string | null
          content?: string | null
          usable_for?: string | null
          processed?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: string
          product_id?: string | null
          source?: string | null
          sentiment?: string | null
          content?: string | null
          usable_for?: string | null
          processed?: boolean | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_daily_metrics
      // ------------------------------------------------------------------ //
      nucleus_daily_metrics: {
        Row: {
          id: string
          date: string
          revenue: number | null
          orders: number | null
          sessions: number | null
          ad_spend_meta: number | null
          ad_spend_tiktok: number | null
          ad_spend_google: number | null
          cogs: number | null
          created_at: string
          /** generated */ readonly total_ad_spend: number | null
          /** generated */ readonly aov: number | null
          /** generated */ readonly cvr: number | null
          /** generated */ readonly mer: number | null
          /** generated */ readonly gross_profit: number | null
          /** generated */ readonly net_profit: number | null
          /** generated */ readonly profit_margin: number | null
          /** generated */ readonly break_even_roas: number | null
        }
        Insert: {
          id?: string
          date: string
          revenue?: number | null
          orders?: number | null
          sessions?: number | null
          ad_spend_meta?: number | null
          ad_spend_tiktok?: number | null
          ad_spend_google?: number | null
          cogs?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          revenue?: number | null
          orders?: number | null
          sessions?: number | null
          ad_spend_meta?: number | null
          ad_spend_tiktok?: number | null
          ad_spend_google?: number | null
          cogs?: number | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_expenses
      // ------------------------------------------------------------------ //
      nucleus_expenses: {
        Row: {
          id: string
          description: string
          date: string
          amount: number
          category: string | null
          type: string | null
          paid: boolean | null
          vendor: string | null
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          date: string
          amount: number
          category?: string | null
          type?: string | null
          paid?: boolean | null
          vendor?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          date?: string
          amount?: number
          category?: string | null
          type?: string | null
          paid?: boolean | null
          vendor?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_software_costs
      // ------------------------------------------------------------------ //
      nucleus_software_costs: {
        Row: {
          id: string
          tool: string
          status: string
          monthly_amount: number | null
          category: string | null
          billing: string | null
          renewal_date: string | null
          link: string | null
          created_at: string
          /** generated */ readonly annual_amount: number | null
        }
        Insert: {
          id?: string
          tool: string
          status?: string
          monthly_amount?: number | null
          category?: string | null
          billing?: string | null
          renewal_date?: string | null
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tool?: string
          status?: string
          monthly_amount?: number | null
          category?: string | null
          billing?: string | null
          renewal_date?: string | null
          link?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_supplier_payments
      // ------------------------------------------------------------------ //
      nucleus_supplier_payments: {
        Row: {
          id: string
          reference: string | null
          status: string
          supplier_id: string | null
          product_id: string | null
          amount: number | null
          units: number | null
          order_date: string | null
          expected_delivery: string | null
          payment_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reference?: string | null
          status?: string
          supplier_id?: string | null
          product_id?: string | null
          amount?: number | null
          units?: number | null
          order_date?: string | null
          expected_delivery?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string | null
          status?: string
          supplier_id?: string | null
          product_id?: string | null
          amount?: number | null
          units?: number | null
          order_date?: string | null
          expected_delivery?: string | null
          payment_method?: string | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_sops
      // ------------------------------------------------------------------ //
      nucleus_sops: {
        Row: {
          id: string
          title: string
          category: string | null
          responsible_role: string | null
          status: string
          video_link: string | null
          body: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          category?: string | null
          responsible_role?: string | null
          status?: string
          video_link?: string | null
          body?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string | null
          responsible_role?: string | null
          status?: string
          video_link?: string | null
          body?: string | null
          updated_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_meetings
      // ------------------------------------------------------------------ //
      nucleus_meetings: {
        Row: {
          id: string
          title: string
          date: string
          type: string | null
          attendees: string[] | null
          agenda: string | null
          decisions: string | null
          product_ids: string[] | null
          supplier_ids: string[] | null
          campaign_ids: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          date: string
          type?: string | null
          attendees?: string[] | null
          agenda?: string | null
          decisions?: string | null
          product_ids?: string[] | null
          supplier_ids?: string[] | null
          campaign_ids?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          date?: string
          type?: string | null
          attendees?: string[] | null
          agenda?: string | null
          decisions?: string | null
          product_ids?: string[] | null
          supplier_ids?: string[] | null
          campaign_ids?: string[] | null
          created_at?: string
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_tasks
      // ------------------------------------------------------------------ //
      nucleus_tasks: {
        Row: {
          id: string
          title: string
          status: string
          priority: string | null
          assignee: string | null
          deadline: string | null
          area: string | null
          product_id: string | null
          campaign_id: string | null
          meeting_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          status?: string
          priority?: string | null
          assignee?: string | null
          deadline?: string | null
          area?: string | null
          product_id?: string | null
          campaign_id?: string | null
          meeting_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          status?: string
          priority?: string | null
          assignee?: string | null
          deadline?: string | null
          area?: string | null
          product_id?: string | null
          campaign_id?: string | null
          meeting_id?: string | null
          created_at?: string
        }
      }
    }

    Views: {
      // ------------------------------------------------------------------ //
      // nucleus_product_rollups
      // ------------------------------------------------------------------ //
      nucleus_product_rollups: {
        Row: {
          id: string | null
          name: string | null
          status: string | null
          winning_score: number | null
          margin_pct: number | null
          total_ad_spend: number | null
          total_revenue: number | null
          product_roas: number | null
          campaign_count: number | null
          creative_count: number | null
          insight_count: number | null
        }
      }

      // ------------------------------------------------------------------ //
      // nucleus_finance_summary
      // ------------------------------------------------------------------ //
      nucleus_finance_summary: {
        Row: {
          total_revenue: number | null
          total_net_profit: number | null
          total_ad_spend: number | null
          overall_mer: number | null
          avg_break_even_roas: number | null
          cash_position: number | null
        }
      }
    }

    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ------------------------------------------------------------------ //
// Convenience row-type aliases
// ------------------------------------------------------------------ //
type Tables = Database['public']['Tables']
type Views  = Database['public']['Views']

export type Supplier         = Tables['nucleus_suppliers']['Row']
export type SupplierInsert   = Tables['nucleus_suppliers']['Insert']
export type SupplierUpdate   = Tables['nucleus_suppliers']['Update']

export type Product          = Tables['nucleus_products']['Row']
export type ProductInsert    = Tables['nucleus_products']['Insert']
export type ProductUpdate    = Tables['nucleus_products']['Update']

export type Campaign         = Tables['nucleus_campaigns']['Row']
export type CampaignInsert   = Tables['nucleus_campaigns']['Insert']
export type CampaignUpdate   = Tables['nucleus_campaigns']['Update']

export type Creative         = Tables['nucleus_creatives']['Row']
export type CreativeInsert   = Tables['nucleus_creatives']['Insert']
export type CreativeUpdate   = Tables['nucleus_creatives']['Update']

export type CustomerInsight       = Tables['nucleus_customer_insights']['Row']
export type CustomerInsightInsert = Tables['nucleus_customer_insights']['Insert']
export type CustomerInsightUpdate = Tables['nucleus_customer_insights']['Update']

export type DailyMetrics         = Tables['nucleus_daily_metrics']['Row']
export type DailyMetricsInsert   = Tables['nucleus_daily_metrics']['Insert']
export type DailyMetricsUpdate   = Tables['nucleus_daily_metrics']['Update']

export type Expense          = Tables['nucleus_expenses']['Row']
export type ExpenseInsert    = Tables['nucleus_expenses']['Insert']
export type ExpenseUpdate    = Tables['nucleus_expenses']['Update']

export type SoftwareCost         = Tables['nucleus_software_costs']['Row']
export type SoftwareCostInsert   = Tables['nucleus_software_costs']['Insert']
export type SoftwareCostUpdate   = Tables['nucleus_software_costs']['Update']

export type SupplierPayment       = Tables['nucleus_supplier_payments']['Row']
export type SupplierPaymentInsert = Tables['nucleus_supplier_payments']['Insert']
export type SupplierPaymentUpdate = Tables['nucleus_supplier_payments']['Update']

export type SOP          = Tables['nucleus_sops']['Row']
export type SOPInsert    = Tables['nucleus_sops']['Insert']
export type SOPUpdate    = Tables['nucleus_sops']['Update']

export type Meeting          = Tables['nucleus_meetings']['Row']
export type MeetingInsert    = Tables['nucleus_meetings']['Insert']
export type MeetingUpdate    = Tables['nucleus_meetings']['Update']

export type Task         = Tables['nucleus_tasks']['Row']
export type TaskInsert   = Tables['nucleus_tasks']['Insert']
export type TaskUpdate   = Tables['nucleus_tasks']['Update']

export type ProductRollup    = Views['nucleus_product_rollups']['Row']
export type FinanceSummary   = Views['nucleus_finance_summary']['Row']
