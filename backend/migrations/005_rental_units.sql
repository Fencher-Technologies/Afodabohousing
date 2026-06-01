-- Rental Units table for multi-unit properties
CREATE TABLE IF NOT EXISTS rental_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    floor_level TEXT,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms INTEGER NOT NULL DEFAULT 1,
    sitting_rooms INTEGER NOT NULL DEFAULT 0,
    kitchens INTEGER NOT NULL DEFAULT 1,
    rent_amount NUMERIC(12,2) NOT NULL,
    rent_currency TEXT NOT NULL DEFAULT 'UGX',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'unlisted')),
    description TEXT,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_units_property ON rental_units(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_owner ON rental_units(owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_status ON rental_units(status);

ALTER TABLE rental_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_can_manage_units" ON rental_units
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "anyone_can_view_available_units" ON rental_units
    FOR SELECT USING (status = 'available' AND is_active = true);

CREATE TRIGGER update_rental_units_updated_at
    BEFORE UPDATE ON rental_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
