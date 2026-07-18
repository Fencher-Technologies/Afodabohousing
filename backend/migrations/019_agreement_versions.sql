BEGIN;

-- Agreement versioning: a tenancy may have multiple agreement versions over
-- its lifetime. Only one version is Active at a time. Uploading a revised
-- agreement archives the previous version and creates a new one. Consent is
-- always tied to the specific agreement (document) version, so a new upload
-- never carries forward a previous version's consent.

ALTER TABLE public.agreement_documents
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'fully_executed'));

-- Backfill existing rows: mark the most recent document per lease as the
-- active version 1, archive any older duplicates.
UPDATE public.agreement_documents
SET is_active = FALSE,
    status = 'archived'
WHERE id NOT IN (
  SELECT DISTINCT ON (lease_id) id
  FROM public.agreement_documents
  ORDER BY lease_id, created_at DESC
);

UPDATE public.agreement_documents
SET status = 'fully_executed'
WHERE is_active = TRUE
  AND EXISTS (
    SELECT 1 FROM public.agreement_consents ac
    WHERE ac.agreement_document_id = agreement_documents.id
      AND ac.consent_status = TRUE
    GROUP BY ac.agreement_document_id
    HAVING COUNT(DISTINCT ac.party_role) = 2
  );

CREATE INDEX IF NOT EXISTS idx_agreement_documents_lease_active
  ON public.agreement_documents(lease_id, is_active, version DESC);

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

COMMIT;
