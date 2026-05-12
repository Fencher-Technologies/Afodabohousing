-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'landlord' CHECK (role IN ('landlord', 'tenant', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT DEFAULT 'USA',
    property_type TEXT NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse', 'studio', 'commercial')),
    bedrooms INTEGER NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
    bathrooms FLOAT NOT NULL DEFAULT 1.0 CHECK (bathrooms >= 0),
    square_feet INTEGER CHECK (square_feet > 0),
    monthly_rent DECIMAL(12, 2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'unlisted')),
    description TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    employer TEXT,
    monthly_income DECIMAL(12, 2) CHECK (monthly_income >= 0),
    credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leases table
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(12, 2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    terms TEXT,
    termination_date DATE,
    termination_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'late_fee', 'maintenance', 'other')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    due_date DATE NOT NULL,
    paid_date DATE,
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    scheduled_date DATE,
    completed_date DATE,
    cost DECIMAL(12, 2) CHECK (cost >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_rent_range ON properties(monthly_rent) WHERE is_active = true AND status = 'available';
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_owner_id ON leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Properties RLS Policies
CREATE POLICY "Landlords can view their properties" ON properties FOR SELECT
    USING (
        owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Landlords can insert their properties" ON properties FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Landlords can update their properties" ON properties FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Landlords can delete their properties" ON properties FOR DELETE
    USING (owner_id = auth.uid());

-- Tenants RLS Policies
CREATE POLICY "Landlords can view their tenants" ON tenants FOR SELECT
    USING (
        owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Landlords can insert their tenants" ON tenants FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Landlords can update their tenants" ON tenants FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Landlords can delete their tenants" ON tenants FOR DELETE
    USING (owner_id = auth.uid());

-- Tenant can view their own record
CREATE POLICY "Tenants can view own tenant profile" ON tenants FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Leases RLS Policies
CREATE POLICY "Landlords can view their leases" ON leases FOR SELECT
    USING (
        owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Landlords can insert their leases" ON leases FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Landlords can update their leases" ON leases FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Landlords can delete their leases" ON leases FOR DELETE
    USING (owner_id = auth.uid());

-- Tenant can view their own lease
CREATE POLICY "Tenants can view own lease" ON leases FOR SELECT
    USING (
        tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
    );

-- Payments RLS Policies
CREATE POLICY "Landlords can view their payments" ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN properties p ON l.property_id = p.id
            WHERE l.id = lease_id AND p.owner_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Landlords can insert their payments" ON payments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN properties p ON l.property_id = p.id
            WHERE l.id = lease_id AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can update their payments" ON payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM leases l
            JOIN properties p ON l.property_id = p.id
            WHERE l.id = lease_id AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can view own payments" ON payments FOR SELECT
    USING (
        tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
    );

-- Maintenance Requests RLS Policies
CREATE POLICY "Landlords can view maintenance requests" ON maintenance_requests FOR SELECT
    USING (
        property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Landlords can insert maintenance requests" ON maintenance_requests FOR INSERT
    WITH CHECK (
        property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    );

CREATE POLICY "Landlords can update maintenance requests" ON maintenance_requests FOR UPDATE
    USING (
        property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    );

CREATE POLICY "Tenants can view own maintenance requests" ON maintenance_requests FOR SELECT
    USING (
        tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
    );

CREATE POLICY "Tenants can create maintenance requests" ON maintenance_requests FOR INSERT
    WITH CHECK (
        tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
    );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'landlord')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_maintenance_requests_updated_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();