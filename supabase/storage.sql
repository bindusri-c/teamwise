
-- Create storage buckets for user files
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profiles', 'profiles', true),
  ('resumes', 'resumes', true),
  ('additional_files', 'additional_files', true);

-- Add RLS policies for storage buckets
CREATE POLICY "Allow authenticated users to view profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profiles');

CREATE POLICY "Allow authenticated users to insert their profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

CREATE POLICY "Allow authenticated users to view resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');

CREATE POLICY "Allow authenticated users to insert their resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Allow authenticated users to view additional files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'additional_files');

CREATE POLICY "Allow authenticated users to insert their additional files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'additional_files');
