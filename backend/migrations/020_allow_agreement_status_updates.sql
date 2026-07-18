BEGIN;

-- Migration 020: Allow workflow status updates on agreement_documents
-- while preserving immutability of the actual evidence columns.

-- The original trigger function in 014_agreement_consents.sql blocked ALL
-- updates to agreement_documents, which prevented the legitimate workflow
-- transition of setting status = 'fully_executed' in record_consent().
--
-- This revision allows updates that do NOT change the evidence columns
-- (agreement_hash, storage_path, file_name), enabling status/is_active
-- transitions while keeping the recorded evidence tamper-proof.
--
-- The trigger on agreement_consents and agreement_audit_logs remains
-- fully immutable — those records must never change after insertion.

CREATE OR REPLACE FUNCTION public.prevent_agreement_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'agreement_documents' AND TG_OP = 'UPDATE' THEN
    -- Allow updates that preserve the evidence columns
    IF OLD.agreement_hash = NEW.agreement_hash
       AND OLD.storage_path = NEW.storage_path
       AND OLD.file_name = NEW.file_name THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Agreement evidence records are immutable';
END;
$$ LANGUAGE plpgsql;

COMMIT;
