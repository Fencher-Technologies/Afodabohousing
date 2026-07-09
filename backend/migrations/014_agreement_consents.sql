BEGIN;

CREATE TABLE IF NOT EXISTS public.agreement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_mime_type TEXT NOT NULL CHECK (
    file_mime_type IN (
      'application/pdf',
      'image/heic',
      'image/heif',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    )
  ),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  storage_path TEXT NOT NULL,
  agreement_url TEXT NOT NULL,
  agreement_hash TEXT NOT NULL CHECK (agreement_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agreement_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  agreement_document_id UUID NOT NULL REFERENCES public.agreement_documents(id) ON DELETE RESTRICT,
  agreement_hash TEXT NOT NULL CHECK (agreement_hash ~ '^[a-f0-9]{64}$'),
  party_role TEXT NOT NULL CHECK (party_role IN ('tenant', 'manager')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  consent_status BOOLEAN NOT NULL DEFAULT true,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agreement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  agreement_document_id UUID NOT NULL REFERENCES public.agreement_documents(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('agreement_uploaded', 'tenant_consented', 'manager_consented')
  ),
  evidence_hash TEXT NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_documents_lease_created
  ON public.agreement_documents(lease_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_documents_hash
  ON public.agreement_documents(agreement_hash);

CREATE INDEX IF NOT EXISTS idx_agreement_consents_document_party
  ON public.agreement_consents(agreement_document_id, party_role, consented_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_consents_lease_user
  ON public.agreement_consents(lease_id, user_id, consented_at DESC);

CREATE INDEX IF NOT EXISTS idx_agreement_audit_logs_lease_created
  ON public.agreement_audit_logs(lease_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_agreement_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Agreement evidence records are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agreement_documents_immutable_update ON public.agreement_documents;
CREATE TRIGGER agreement_documents_immutable_update
  BEFORE UPDATE OR DELETE ON public.agreement_documents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agreement_evidence_mutation();

DROP TRIGGER IF EXISTS agreement_consents_immutable_update ON public.agreement_consents;
CREATE TRIGGER agreement_consents_immutable_update
  BEFORE UPDATE OR DELETE ON public.agreement_consents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agreement_evidence_mutation();

DROP TRIGGER IF EXISTS agreement_audit_logs_immutable_update ON public.agreement_audit_logs;
CREATE TRIGGER agreement_audit_logs_immutable_update
  BEFORE UPDATE OR DELETE ON public.agreement_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agreement_evidence_mutation();

ALTER TABLE public.agreement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agreement parties can view documents" ON public.agreement_documents;
CREATE POLICY "Agreement parties can view documents" ON public.agreement_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      LEFT JOIN public.tenants t ON t.id = l.tenant_id
      WHERE l.id = agreement_documents.lease_id
        AND (l.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agreement parties can create documents" ON public.agreement_documents;
CREATE POLICY "Agreement parties can create documents" ON public.agreement_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leases l
      LEFT JOIN public.tenants t ON t.id = l.tenant_id
      WHERE l.id = agreement_documents.lease_id
        AND (l.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agreement parties can view consents" ON public.agreement_consents;
CREATE POLICY "Agreement parties can view consents" ON public.agreement_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      LEFT JOIN public.tenants t ON t.id = l.tenant_id
      WHERE l.id = agreement_consents.lease_id
        AND (l.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agreement parties can create own consents" ON public.agreement_consents;
CREATE POLICY "Agreement parties can create own consents" ON public.agreement_consents
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leases l
      LEFT JOIN public.tenants t ON t.id = l.tenant_id
      WHERE l.id = agreement_consents.lease_id
        AND (l.owner_id = auth.uid() OR t.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view agreement audit logs" ON public.agreement_audit_logs;
CREATE POLICY "Admins can view agreement audit logs" ON public.agreement_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenancy-agreements', 'tenancy-agreements', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
