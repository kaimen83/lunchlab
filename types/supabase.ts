export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      company_features: {
        Row: {
          id: string
          company_id: string
          feature_name: string
          is_enabled: boolean
          config: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          feature_name: string
          is_enabled: boolean
          config?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          feature_name?: string
          is_enabled?: boolean
          config?: Json | null
          created_at?: string
          updated_at?: string | null
        }
      }
      company_memberships: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      company_join_requests: {
        Row: {
          id: string
          company_id: string
          user_id: string
          message: string | null
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      ingredients: {
        Row: {
          id: string
          company_id: string
          name: string
          package_amount: number
          unit: string
          price: number
          memo1: string | null
          memo2: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          package_amount: number
          unit: string
          price: number
          memo1?: string | null
          memo2?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          package_amount?: number
          unit?: string
          price?: number
          memo1?: string | null
          memo2?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      ingredient_price_history: {
        Row: {
          id: string
          ingredient_id: string
          price: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          ingredient_id: string
          price: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          ingredient_id?: string
          price?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      menus: {
        Row: {
          id: string
          company_id: string
          name: string
          cost: number
          price: number
          description: string | null
          recipe: string | null
          serving_size: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          cost: number
          price: number
          description?: string | null
          recipe?: string | null
          serving_size?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cost?: number
          price?: number
          description?: string | null
          recipe?: string | null
          serving_size?: number | null
          created_at?: string
          updated_at?: string | null
        }
      }
      menu_ingredients: {
        Row: {
          id: string
          menu_id: string
          ingredient_id: string
          amount: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          menu_id: string
          ingredient_id: string
          amount: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          menu_id?: string
          ingredient_id?: string
          amount?: number
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 