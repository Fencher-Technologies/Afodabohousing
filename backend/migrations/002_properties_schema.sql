-- Supabase SQL Schema for Properties Table
-- Compatible with FastAPI Pydantic models

-- 1. Create ENUMs
DO $$ BEGIN
    CREATE TYPE property_status AS ENUM ('available', 'occupied', 'maintenance', 'unlisted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_type AS ENUM ('apartment', 'house', 'condo', 'townhouse', 'studio', 'commercial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'USA',
    property_type property_type NOT NULL DEFAULT 'apartment',
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    square_feet INTEGER,
    monthly_rent NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0,
    status property_status NOT NULL DEFAULT 'available',
    description TEXT,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger to properties table
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Policy 1: Owners can INSERT their own properties
CREATE POLICY "owners_can_insert_own_properties" ON properties
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Policy 2: Owners can SELECT their own properties (all statuses)
CREATE POLICY "owners_can_select_own_properties" ON properties
    FOR SELECT
    USING (owner_id = auth.uid());

-- Policy 3: Owners can UPDATE their own properties
CREATE POLICY "owners_can_update_own_properties" ON properties
    FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy 4: Owners can DELETE their own properties
CREATE POLICY "owners_can_delete_own_properties" ON properties
    FOR DELETE
    USING (owner_id = auth.uid());

-- Policy 5: Any authenticated user can SELECT available properties
CREATE POLICY "authenticated_can_select_available_properties" ON properties
    FOR SELECT
    USING (
        status = 'available'
        AND is_active = true
        AND auth.role() = 'authenticated'
    );

-- 7. Create indexes

-- Index on owner_id for fast lookup of user's properties
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);

-- Index on status for filtering by property status
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Index on city for location-based searches
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- Index on property_type for filtering by property type
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);

-- Index on is_active for filtering active/inactive properties
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);

-- Composite index for public listings (common query pattern)
CREATE INDEX IF NOT EXISTS idx_properties_available_active ON properties(status, is_active)
    WHERE status = 'available' AND is_active = true;

-- Composite index for owner's property management
CREATE INDEX IF NOT EXISTS idx_properties_owner_status ON properties(owner_id, status);