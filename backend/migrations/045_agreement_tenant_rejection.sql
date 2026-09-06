-- Tenant-initiated agreement rejection with a comment for the manager.
--
-- Previously a tenant could only consent; disagreeing meant contacting the
-- manager out of band. This adds a "changes_requested" document state plus the
-- reason the tenant gave, so the manager can see what to adjust and revise.
--
-- Already applied to the live project on 2026-09-05.

ALTER TABLE public.agreement_documents
  DROP CONSTRAINT IF EXISTS agreement_documents_status_check;

ALTER TABLE public.agreement_documents
  ADD CONSTRAINT agreement_documents_status_check
  CHECK (status = ANY (ARRAY[
    'draft',
    'awaiting_tenant_consent',
    'awaiting_manager_consent',
    'changes_requested',
    'executed',
    'superseded',
    'cancelled',
    'active',
    'archived',
    'fully_executed'
  ]));

ALTER TABLE public.agreement_documents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID;

-- The comment is also kept on the consent record itself, so the audit trail
-- holds every round of objections rather than only the most recent one.
-- consent_status already permits 'declined'.
ALTER TABLE public.agreement_consents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
