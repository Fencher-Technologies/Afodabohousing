-- Relax constraints on agreement_documents for generated (non-uploaded) agreements
-- Generated agreements store content as JSONB, not as uploaded files.

-- 1. Allow 'application/json' in file_mime_type
ALTER TABLE public.agreement_documents
  DROP CONSTRAINT IF EXISTS agreement_documents_file_mime_type_check;

ALTER TABLE public.agreement_documents
  ADD CONSTRAINT agreement_documents_file_mime_type_check
    CHECK (file_mime_type IN (
      'application/pdf',
      'application/json',
      'image/heic',
      'image/heif',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ));

-- 2. Make upload-specific columns nullable for generated agreements
ALTER TABLE public.agreement_documents
  ALTER COLUMN file_size DROP NOT NULL;

ALTER TABLE public.agreement_documents
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.agreement_documents
  ALTER COLUMN agreement_url DROP NOT NULL;

ALTER TABLE public.agreement_documents
  ALTER COLUMN agreement_hash DROP NOT NULL;
