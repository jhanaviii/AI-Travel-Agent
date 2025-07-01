-- Fix Row Level Security Policies for Travel App

-- Allow public read access to destinations
CREATE POLICY "Allow public read access to destinations" ON destinations
    FOR SELECT USING (true);

-- Allow public read access to users (for basic profile info)
CREATE POLICY "Allow public read access to users" ON users
    FOR SELECT USING (true);

-- Allow public read access to visualizations
CREATE POLICY "Allow public read access to visualizations" ON user_visualizations
    FOR SELECT USING (true);

-- Allow public insert access to visualizations (for creating new visualizations)
CREATE POLICY "Allow public insert access to visualizations" ON user_visualizations
    FOR INSERT WITH CHECK (true);

-- Allow public insert access to users (for user registration)
CREATE POLICY "Allow public insert access to users" ON users
    FOR INSERT WITH CHECK (true);

-- Allow public update access to users (for profile updates)
CREATE POLICY "Allow public update access to users" ON users
    FOR UPDATE USING (true);

-- Storage policies for user-photos bucket
CREATE POLICY "Allow public upload to user-photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'user-photos');

CREATE POLICY "Allow public read from user-photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-photos');

-- Storage policies for generated-images bucket
CREATE POLICY "Allow public upload to generated-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'generated-images');

CREATE POLICY "Allow public read from generated-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'generated-images');

-- If policies already exist, drop them first
-- DROP POLICY IF EXISTS "Allow public read access to destinations" ON destinations;
-- DROP POLICY IF EXISTS "Allow public read access to users" ON users;
-- DROP POLICY IF EXISTS "Allow public read access to visualizations" ON user_visualizations;
-- DROP POLICY IF EXISTS "Allow public insert access to visualizations" ON user_visualizations;
-- DROP POLICY IF EXISTS "Allow public insert access to users" ON users;
-- DROP POLICY IF EXISTS "Allow public update access to users" ON users;
-- DROP POLICY IF EXISTS "Allow public upload to user-photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public read from user-photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public upload to generated-images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public read from generated-images" ON storage.objects; 