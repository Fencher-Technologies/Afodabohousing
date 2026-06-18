export type Json = boolean | number | string | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_read: boolean;
          property_id: string | null;
          receiver_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          property_id?: string | null;
          receiver_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          property_id?: string | null;
          receiver_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          lease_id: string;
          notes: string | null;
          period_end: string;
          period_start: string;
          proof_url: string | null;
          receipt_url: string | null;
          status: Database['public']['Enums']['payment_status'];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          lease_id: string;
          notes?: string | null;
          period_end: string;
          period_start: string;
          proof_url?: string | null;
          receipt_url?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          lease_id?: string;
          notes?: string | null;
          period_end?: string;
          period_start?: string;
          proof_url?: string | null;
          receipt_url?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string | null;
          amenities: string[] | null;
          area: string | null;
          bathrooms: number;
          bedrooms: number;
          city: string | null;
          created_at: string;
          description: string | null;
          district: string;
          id: string;
          images: string[] | null;
          kitchens: number;
          manager_email: string | null;
          manager_phone: string | null;
          owner_id: string;
          property_type: Database['public']['Enums']['property_type'];
          rent_amount: number;
          rent_currency: string;
          rent_period: Database['public']['Enums']['rent_period'];
          sitting_rooms: number;
          status: Database['public']['Enums']['property_status'];
          title: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          amenities?: string[] | null;
          area?: string | null;
          bathrooms?: number;
          bedrooms?: number;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          district: string;
          id?: string;
          images?: string[] | null;
          kitchens?: number;
          manager_email?: string | null;
          manager_phone?: string | null;
          owner_id: string;
          property_type?: Database['public']['Enums']['property_type'];
          rent_amount: number;
          rent_currency?: string;
          rent_period?: Database['public']['Enums']['rent_period'];
          sitting_rooms?: number;
          status?: Database['public']['Enums']['property_status'];
          title: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          amenities?: string[] | null;
          area?: string | null;
          bathrooms?: number;
          bedrooms?: number;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          district?: string;
          id?: string;
          images?: string[] | null;
          kitchens?: number;
          manager_email?: string | null;
          manager_phone?: string | null;
          owner_id?: string;
          property_type?: Database['public']['Enums']['property_type'];
          rent_amount?: number;
          rent_currency?: string;
          rent_period?: Database['public']['Enums']['rent_period'];
          sitting_rooms?: number;
          status?: Database['public']['Enums']['property_status'];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      leases: {
        Row: {
          agreement_url?: string | null;
          created_at: string;
          end_date: string;
          id: string;
          monthly_rent: number;
          owner_id: string;
          property_id: string;
          start_date: string;
          status: Database['public']['Enums']['tenancy_status'];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          agreement_url?: string | null;
          created_at?: string;
          end_date: string;
          id?: string;
          monthly_rent: number;
          owner_id: string;
          property_id: string;
          start_date: string;
          status?: Database['public']['Enums']['tenancy_status'];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          agreement_url?: string | null;
          created_at?: string;
          end_date?: string;
          id?: string;
          monthly_rent?: number;
          owner_id?: string;
          property_id?: string;
          start_date?: string;
          status?: Database['public']['Enums']['tenancy_status'];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: 'tenant' | 'house_manager' | 'admin';
      payment_status: 'pending' | 'uploaded' | 'confirmed' | 'rejected';
      property_status: 'available' | 'occupied' | 'inactive';
      property_type: 'house' | 'apartment' | 'self_contained' | 'room' | 'studio' | 'bungalow';
      rent_period: 'monthly' | 'quarterly' | 'annually';
      tenancy_status: 'active' | 'expired' | 'terminated';
    };
    CompositeTypes: Record<string, never>;
  };
}

export type AppRole = Database['public']['Enums']['app_role'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type PropertyRow = Database['public']['Tables']['properties']['Row'];
export type TenantRow = Database['public']['Tables']['tenants']['Row'];
export type LeaseRow = Database['public']['Tables']['leases']['Row'];
