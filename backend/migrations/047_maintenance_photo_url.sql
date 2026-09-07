-- The web tenant dashboard uploads a photo with a maintenance request and
-- inserts photo_url, but the column never existed -- so every submission with
-- a photo failed on insert. Already applied to the live project.
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
