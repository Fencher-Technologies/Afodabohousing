-- Fix trigger to handle NULL columns properly (IS NOT DISTINCT FROM instead of =)
-- Generated agreements have NULL storage_path, so OLD.storage_path = NEW.storage_path
-- evaluates to NULL (falsy) even when both are NULL.

CREATE OR REPLACE FUNCTION public.prevent_agreement_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'agreement_documents' AND TG_OP = 'UPDATE' THEN
    IF OLD.agreement_hash IS NOT DISTINCT FROM NEW.agreement_hash
       AND OLD.storage_path IS NOT DISTINCT FROM NEW.storage_path
       AND OLD.file_name IS NOT DISTINCT FROM NEW.file_name THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'agreement_consents' AND TG_OP = 'UPDATE' THEN
    IF OLD.agreement_hash IS NOT DISTINCT FROM NEW.agreement_hash
       AND OLD.agreement_document_id IS NOT DISTINCT FROM NEW.agreement_document_id
       AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id
       AND OLD.party_role IS NOT DISTINCT FROM NEW.party_role THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Agreement evidence records cannot be deleted';
  END IF;
  RAISE EXCEPTION 'Agreement evidence records are immutable';
END;
$$ LANGUAGE plpgsql;
