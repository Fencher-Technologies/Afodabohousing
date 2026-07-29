CREATE TABLE IF NOT EXISTS saved_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_saved_phones_user ON saved_phones(user_id, usage_count DESC);

ALTER TABLE saved_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_phones" ON saved_phones
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
