
-- 1. Make content bucket private
UPDATE storage.buckets SET public = false WHERE id = 'content';

-- 2. Drop overly permissive storage policies for content bucket
DROP POLICY IF EXISTS "Public read on content" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read content" ON storage.objects;

-- 3. Add proper content bucket policies - admins and teachers can upload
CREATE POLICY "Admins manage content storage" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'content' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'content' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Teachers manage own course content storage" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'content' AND public.has_role(auth.uid(), 'teacher'::public.app_role))
WITH CHECK (bucket_id = 'content' AND public.has_role(auth.uid(), 'teacher'::public.app_role));

-- 4. Fix assignments bucket - drop overly permissive policy
DROP POLICY IF EXISTS "Auth users manage assignments" ON storage.objects;

-- Students can manage own assignments (folder path = user_id/...)
CREATE POLICY "Students manage own assignment files" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'assignments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can manage all assignments
CREATE POLICY "Admins manage all assignment files" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'assignments' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'assignments' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Teachers can read assignment files for grading
CREATE POLICY "Teachers read assignment files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'assignments' AND public.has_role(auth.uid(), 'teacher'::public.app_role));
