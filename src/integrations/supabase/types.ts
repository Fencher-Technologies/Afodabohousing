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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          property_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          property_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          property_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          manager_id: string
          notes: string | null
          period_end: string
          period_start: string
          proof_url: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenancy_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          manager_id: string
          notes?: string | null
          period_end: string
          period_start: string
          proof_url?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenancy_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          manager_id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          proof_url?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenancy_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          area: string | null
          bathrooms: number
          bedrooms: number
          city: string | null
          created_at: string
          description: string | null
          district: string
          id: string
          images: string[] | null
          is_boosted?: boolean | null
          kitchens: number
          manager_email: string | null
          manager_id: string
          manager_phone: string | null
          boosted_until?: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          rent_amount: number
          rent_currency: string
          rent_period: Database["public"]["Enums"]["rent_period"]
          sitting_rooms: number
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          created_at?: string
          description?: string | null
          district: string
          id?: string
          images?: string[] | null
          is_boosted?: boolean | null
          kitchens?: number
          manager_email?: string | null
          manager_id: string
          manager_phone?: string | null
          boosted_until?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rent_amount: number
          rent_currency?: string
          rent_period?: Database["public"]["Enums"]["rent_period"]
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string
          id?: string
          images?: string[] | null
          is_boosted?: boolean | null
          kitchens?: number
          manager_email?: string | null
          manager_id?: string
          manager_phone?: string | null
          boosted_until?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rent_amount?: number
          rent_currency?: string
          rent_period?: Database["public"]["Enums"]["rent_period"]
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rental_units: {
        Row: {
          amenities: string[] | null
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string | null
          floor_level: string | null
          id: string
          kitchens: number
          property_id: string
          rent_amount: number
          rent_currency: string
          sitting_rooms: number
          status: Database["public"]["Enums"]["property_status"]
          unit_number: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          floor_level?: string | null
          id?: string
          kitchens?: number
          property_id: string
          rent_amount: number
          rent_currency?: string
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          unit_number: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          floor_level?: string | null
          id?: string
          kitchens?: number
          property_id?: string
          rent_amount?: number
          rent_currency?: string
          sitting_rooms?: number
          status?: Database["public"]["Enums"]["property_status"]
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          agreement_url: string | null
          created_at: string
          id: string
          manager_id: string
          property_id: string
          rent_amount: number
          rent_end_date: string
          rent_period: Database["public"]["Enums"]["rent_period"]
          rent_start_date: string
          status: Database["public"]["Enums"]["tenancy_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agreement_url?: string | null
          created_at?: string
          id?: string
          manager_id: string
          property_id: string
          rent_amount: number
          rent_end_date: string
          rent_period: Database["public"]["Enums"]["rent_period"]
          rent_start_date: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agreement_url?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          property_id?: string
          rent_amount?: number
          rent_end_date?: string
          rent_period?: Database["public"]["Enums"]["rent_period"]
          rent_start_date?: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_by_user_id: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          phone: string
        }[]
      }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "tenant" | "house_manager" | "admin"
      payment_status: "pending" | "uploaded" | "confirmed" | "rejected"
      property_status: "available" | "occupied" | "inactive"
      property_type: "Residential" | "Office Space"
      rent_period: "monthly" | "quarterly" | "annually"
      tenancy_status: "active" | "expired" | "terminated"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["tenant", "house_manager", "admin"],
      payment_status: ["pending", "uploaded", "confirmed", "rejected"],
      property_status: ["available", "occupied", "inactive"],
      property_type: ["Residential", "Office Space"],
      rent_period: ["monthly", "quarterly", "annually"],
      tenancy_status: ["active", "expired", "terminated"],
    },
  },
} as const
