-- Maintenance-request photo attachments. TenantDashboard uploaded to a
-- bucket named "photos" that never existed, so every attachment silently
-- failed and the request was sent with photo_url: null.
--
-- Public to match property-images / payment-proofs, because the frontend
-- uses getPublicUrl(). See the security note: public buckets rely on
-- unguessable paths, not access control.

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload maintenance photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

DROP POLICY IF EXISTS "Anyone can view maintenance photos" ON storage.objects;
CREATE POLICY "Anyone can view maintenance photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'maintenance-photos');

DROP POLICY IF EXISTS "Owners can delete their maintenance photos" ON storage.objects;
CREATE POLICY "Owners can delete their maintenance photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-photos' AND owner = auth.uid());
