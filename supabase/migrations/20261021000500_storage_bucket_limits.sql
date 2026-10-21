-- Size and type limits on the upload buckets.
--
-- None of these buckets had a size or MIME restriction, so any signed-in user
-- could put a file of any size and type into a bucket that is served publicly.
-- The web app uploads straight to storage (not through the API), so the limit
-- has to live on the bucket to cover it. The API's /uploads routes apply the
-- same rules, checked against the file's real bytes.
--
-- Only affects new uploads; existing objects are untouched.
-- Rollback: update storage.buckets set file_size_limit = null,
--           allowed_mime_types = null where id in (...);

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'property-images';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                             'image/heic', 'image/heif', 'application/pdf']
where id = 'payment-proofs';

update storage.buckets set
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                             'image/heic', 'image/heif']
where id = 'maintenance-photos';

update storage.buckets set
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
                             'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
                             'audio/ogg', 'audio/3gpp', 'audio/amr']
where id = 'voice-notes';
