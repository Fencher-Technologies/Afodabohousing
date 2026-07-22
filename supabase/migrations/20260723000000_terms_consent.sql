CREATE TABLE IF NOT EXISTS terms_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT 'Terms and Conditions',
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terms_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version_id UUID NOT NULL REFERENCES terms_versions(id),
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE UNIQUE INDEX idx_terms_consents_user_version
    ON terms_consents(user_id, terms_version_id);

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS terms_version_id UUID REFERENCES terms_versions(id);
