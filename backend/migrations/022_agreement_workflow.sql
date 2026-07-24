BEGIN;

-- ==========================================================================
-- Migration 022: Agreement Builder, Electronic Signatures & Consent Workflow
--
-- Adds:
--   1. agreement_templates table (reusable clause templates)
--   2. content + agreement_number + agreement_type columns to agreement_documents
--   3. signed_name + consent_version + consent_status (text) to agreement_consents
--   4. Expanded lifecycle: draft / awaiting_tenant_consent / awaiting_manager_consent
--      / executed / superseded / cancelled
--   5. Relaxed trigger on agreement_consents (allows signed_name/consent_status updates)
--   6. Expanded audit event types
--   7. Default template with 10 standard clauses
-- ==========================================================================

-- 1. AGREEMENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  standard_clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agreement templates"
  ON public.agreement_templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage agreement templates"
  ON public.agreement_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Only admins can update agreement templates"
  ON public.agreement_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  ));

-- 2. SEQUENCE FOR AGREEMENT NUMBERS
CREATE SEQUENCE IF NOT EXISTS public.agreement_number_seq START 1;

-- 3. AGREEMENT DOCUMENTS — new columns
ALTER TABLE public.agreement_documents
  ADD COLUMN IF NOT EXISTS content JSONB,
  ADD COLUMN IF NOT EXISTS agreement_type TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (agreement_type IN ('uploaded', 'generated')),
  ADD COLUMN IF NOT EXISTS agreement_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Broaden status CHECK to include full lifecycle
ALTER TABLE public.agreement_documents
  DROP CONSTRAINT IF EXISTS agreement_documents_status_check;

ALTER TABLE public.agreement_documents
  ADD CONSTRAINT agreement_documents_status_check
    CHECK (status IN (
      'draft', 'awaiting_tenant_consent', 'awaiting_manager_consent',
      'executed', 'superseded', 'cancelled', 'active', 'archived', 'fully_executed'
    ));

-- 4. AGREEMENT CONSENTS — add columns BEFORE modifying trigger
ALTER TABLE public.agreement_consents
  ADD COLUMN IF NOT EXISTS signed_name TEXT,
  ADD COLUMN IF NOT EXISTS consent_version INTEGER NOT NULL DEFAULT 1;

-- 5. RELAX TRIGGER — MUST replace BEFORE any UPDATE on agreement_consents
-- Allow updates to signed_name, consent_version, and consent_status
-- while preserving immutability of evidence columns
CREATE OR REPLACE FUNCTION public.prevent_agreement_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'agreement_documents' AND TG_OP = 'UPDATE' THEN
    IF OLD.agreement_hash = NEW.agreement_hash
       AND OLD.storage_path = NEW.storage_path
       AND OLD.file_name = NEW.file_name THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'agreement_consents' AND TG_OP = 'UPDATE' THEN
    IF OLD.agreement_hash = NEW.agreement_hash
       AND OLD.agreement_document_id = NEW.agreement_document_id
       AND OLD.user_id = NEW.user_id
       AND OLD.party_role = NEW.party_role THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Agreement evidence records cannot be deleted';
  END IF;
  RAISE EXCEPTION 'Agreement evidence records are immutable';
END;
$$ LANGUAGE plpgsql;

-- 6. CONVERT consent_status from BOOLEAN to TEXT (trigger now allows this)
ALTER TABLE public.agreement_consents
  ADD COLUMN IF NOT EXISTS consent_status_text TEXT NOT NULL DEFAULT 'approved'
    CHECK (consent_status_text IN ('pending', 'approved', 'declined'));

UPDATE public.agreement_consents
  SET consent_status_text = CASE WHEN consent_status THEN 'approved' ELSE 'pending' END;

ALTER TABLE public.agreement_consents
  DROP COLUMN IF EXISTS consent_status;

ALTER TABLE public.agreement_consents
  RENAME COLUMN consent_status_text TO consent_status;

-- 7. EXPANDED AUDIT EVENT TYPES
ALTER TABLE public.agreement_audit_logs
  DROP CONSTRAINT IF EXISTS agreement_audit_logs_event_type_check;

ALTER TABLE public.agreement_audit_logs
  ADD CONSTRAINT agreement_audit_logs_event_type_check
    CHECK (event_type IN (
      'agreement_uploaded', 'agreement_generated', 'agreement_edited',
      'tenant_consented', 'manager_consented',
      'agreement_superseded', 'agreement_cancelled',
      'pdf_downloaded'
    ));

-- 8. TRIGGER FOR UPDATED_AT ON agreement_documents
CREATE OR REPLACE FUNCTION public.update_agreement_documents_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agreement_documents_updated_at ON public.agreement_documents;
CREATE TRIGGER agreement_documents_updated_at
  BEFORE UPDATE ON public.agreement_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_agreement_documents_updated_at();

-- 9. DEFAULT TEMPLATE
INSERT INTO public.agreement_templates (name, description, is_default, standard_clauses)
VALUES (
  'Standard Ugandan Tenancy Agreement',
  'Default template for residential tenancy agreements in Uganda. Includes standard legal clauses with sensible defaults.',
  true,
  '[
    {
      "key": "maintenance_obligations",
      "title": "Maintenance Obligations",
      "optional": false,
      "enabled_by_default": true,
      "content": "The Landlord shall be responsible for major structural repairs including the roof, foundation, and external walls. The Tenant shall be responsible for day-to-day maintenance including changing light bulbs, maintaining cleanliness, and minor repairs up to UGX 50,000."
    },
    {
      "key": "utilities_and_services",
      "title": "Utilities and Services",
      "optional": false,
      "enabled_by_default": true,
      "content": "The Tenant shall pay for electricity, water, and internet services directly to the respective providers. The Landlord shall pay for garbage collection and security services for the compound."
    },
    {
      "key": "inspection_rights",
      "title": "Inspection Rights",
      "optional": false,
      "enabled_by_default": true,
      "content": "The Landlord or their authorised agent may inspect the premises upon giving 48 hours written notice to the Tenant, except in cases of emergency."
    },
    {
      "key": "late_payment",
      "title": "Late Payment",
      "optional": false,
      "enabled_by_default": true,
      "content": "Rent is due on or before the 5th day of each month. A late payment penalty of 2% per month shall apply to any amount outstanding beyond the due date."
    },
    {
      "key": "termination",
      "title": "Termination",
      "optional": false,
      "enabled_by_default": true,
      "content": "Either party may terminate this agreement by giving 30 days written notice. The Landlord may terminate immediately in case of breach of terms, non-payment of rent for 2 consecutive months, or illegal activity on the premises."
    },
    {
      "key": "property_use",
      "title": "Property Use",
      "optional": false,
      "enabled_by_default": true,
      "content": "The premises shall be used exclusively as a private residence. No commercial activity, subletting, or assignment is permitted without the Landlord prior written consent."
    },
    {
      "key": "damage_and_repairs",
      "title": "Damage and Repairs",
      "optional": false,
      "enabled_by_default": true,
      "content": "The Tenant shall notify the Landlord immediately of any damage to the premises. The Tenant shall be liable for damage caused by negligence or misuse beyond normal wear and tear."
    },
    {
      "key": "quiet_enjoyment",
      "title": "Quiet Enjoyment",
      "optional": false,
      "enabled_by_default": true,
      "content": "The Tenant shall have the right to quiet enjoyment of the premises. The Tenant shall not cause nuisance or disturbance to neighbouring tenants."
    },
    {
      "key": "subletting",
      "title": "Subletting",
      "optional": false,
      "enabled_by_default": true,
      "content": "Subletting or assigning this agreement or any part thereof is strictly prohibited without the prior written consent of the Landlord."
    },
    {
      "key": "governing_law",
      "title": "Governing Law",
      "optional": false,
      "enabled_by_default": true,
      "content": "This agreement shall be governed by and construed in accordance with the laws of the Republic of Uganda."
    },
    {
      "key": "parking",
      "title": "Parking",
      "optional": true,
      "enabled_by_default": false,
      "content": "One designated parking space is allocated to the Tenant. Guest parking is available in the visitor area. Parking of commercial vehicles on the premises is prohibited."
    },
    {
      "key": "pets",
      "title": "Pet Policy",
      "optional": true,
      "enabled_by_default": false,
      "content": "Pets are allowed only with the prior written consent of the Landlord. An additional refundable pet deposit of UGX 100,000 shall be paid. The Tenant shall be fully responsible for any damage caused by pets."
    }
  ]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agreement_documents_agreement_number
  ON public.agreement_documents(agreement_number);

CREATE INDEX IF NOT EXISTS idx_agreement_consents_doc_status
  ON public.agreement_consents(agreement_document_id, party_role, consent_status);

COMMIT;
