-- ROYAL IMMO - Migration 003: Supabase Storage Buckets & Access Policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('property-images', 'property-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-photos', 'profile-photos', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('agency-logos', 'agency-logos', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('property-documents', 'property-documents', FALSE, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Public read on public media buckets
CREATE POLICY "Public read property images" ON storage.objects FOR SELECT
  USING (bucket_id IN ('property-images', 'profile-photos', 'agency-logos'));

-- Authenticated users upload to their own prefix
CREATE POLICY "Users upload own property images" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own property images" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users manage own profile photo" ON storage.objects FOR ALL
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Agency owners manage logos" ON storage.objects FOR ALL
  USING (
    bucket_id = 'agency-logos'
    AND auth.role() = 'authenticated'
  );

-- Private documents bucket: only owner or admin
CREATE POLICY "Private property documents access" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "Private property documents upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
