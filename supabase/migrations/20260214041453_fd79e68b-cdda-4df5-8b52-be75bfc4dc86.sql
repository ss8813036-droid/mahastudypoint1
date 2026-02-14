
-- ============================================
-- MahaStudyPoint Full Database Schema
-- ============================================

-- 1. ROLE ENUM & USER ROLES
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  semester INTEGER,
  branch TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  semester INTEGER,
  subject TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  validity_days INTEGER, -- null = lifetime
  is_launched BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view launched courses" ON public.courses FOR SELECT USING (is_launched = true);
CREATE POLICY "Admins can do everything on courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers see own courses" ON public.courses FOR SELECT TO authenticated USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Approved teachers can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'teacher') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true)
);
CREATE POLICY "Teachers can update own courses" ON public.courses FOR UPDATE TO authenticated USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

-- 4. ENROLLMENTS
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token_id UUID,
  UNIQUE (user_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can see enrollments for own courses" ON public.enrollments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid())
);

-- 5. TOKENS
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tokens" ON public.tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. FOLDERS
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can see folders" ON public.folders FOR SELECT TO authenticated USING (
  course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);
-- Free content folders visible to all
CREATE POLICY "Public folders for launched courses" ON public.folders FOR SELECT USING (
  course_id IN (SELECT id FROM public.courses WHERE is_launched = true)
);
CREATE POLICY "Admins can manage folders" ON public.folders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own course folders" ON public.folders FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid())
);

-- 7. CONTENT
CREATE TYPE public.content_type AS ENUM ('pdf', 'image');
CREATE TYPE public.access_type AS ENUM ('free', 'paid', 'specific');

CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL DEFAULT 'pdf',
  file_url TEXT NOT NULL,
  file_size BIGINT,
  unit_name TEXT,
  chapter_name TEXT,
  allow_download BOOLEAN NOT NULL DEFAULT false,
  add_watermark BOOLEAN NOT NULL DEFAULT true,
  access_type access_type NOT NULL DEFAULT 'paid',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Free content visible to all" ON public.content FOR SELECT USING (
  access_type = 'free' AND course_id IN (SELECT id FROM public.courses WHERE is_launched = true)
);
CREATE POLICY "Enrolled users can see paid content" ON public.content FOR SELECT TO authenticated USING (
  course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage content" ON public.content FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own course content" ON public.content FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid())
);

-- 8. CONTENT ACCESS (for specific users)
CREATE TABLE public.content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, user_id)
);
ALTER TABLE public.content_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own access" ON public.content_access FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage access" ON public.content_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can read chat" ON public.chat_messages FOR SELECT TO authenticated USING (
  course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);
CREATE POLICY "Enrolled users can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND (
    course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
  )
);
CREATE POLICY "Admins can manage chat" ON public.chat_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 10. TESTS
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can see published tests" ON public.tests FOR SELECT TO authenticated USING (
  is_published = true AND course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage tests" ON public.tests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own course tests" ON public.tests FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid())
);

-- 11. TEST QUESTIONS
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can see questions for published tests" ON public.test_questions FOR SELECT TO authenticated USING (
  test_id IN (SELECT id FROM public.tests WHERE is_published = true AND course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid()))
);
CREATE POLICY "Admins can manage questions" ON public.test_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own test questions" ON public.test_questions FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND test_id IN (SELECT id FROM public.tests WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);

-- 12. TEST SUBMISSIONS
CREATE TABLE public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  total_questions INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, user_id)
);
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own submissions" ON public.test_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can submit tests" ON public.test_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can see all submissions" ON public.test_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can see submissions for own courses" ON public.test_submissions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND test_id IN (SELECT id FROM public.tests WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);

-- 13. ASSIGNMENTS
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can see published assignments" ON public.assignments FOR SELECT TO authenticated USING (
  is_published = true AND course_id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage assignments" ON public.assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own course assignments" ON public.assignments FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid())
);

-- 14. ASSIGNMENT SUBMISSIONS
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, user_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own assignment submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can submit assignments" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage assignment submissions" ON public.assignment_submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage submissions for own courses" ON public.assignment_submissions FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND assignment_id IN (SELECT id FROM public.assignments WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);

-- 15. APP SETTINGS (admin config)
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('whatsapp_number', ''),
  ('whatsapp_message_template', 'Hi, I want to buy the course: {course_name}. My name is {student_name}.'),
  ('whatsapp_enabled', 'true'),
  ('maintenance_mode', 'false');

-- 16. CONTENT VIEWS (analytics)
CREATE TABLE public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log views" ON public.content_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can see all views" ON public.content_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can see views for own content" ON public.content_views FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'teacher') AND content_id IN (SELECT id FROM public.content WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = auth.uid()))
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Token redemption function
CREATE OR REPLACE FUNCTION public.redeem_token(token_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token RECORD;
  v_course RECORD;
  v_user_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_token FROM public.tokens WHERE code = token_code FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  IF v_token.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token already used');
  END IF;

  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token expired');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = v_token.course_id;

  IF v_course.validity_days IS NOT NULL THEN
    v_expires_at := now() + (v_course.validity_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Mark token used
  UPDATE public.tokens SET is_used = true, used_by = v_user_id, used_at = now() WHERE id = v_token.id;

  -- Create enrollment
  INSERT INTO public.enrollments (user_id, course_id, expires_at, token_id)
  VALUES (v_user_id, v_token.course_id, v_expires_at, v_token.id)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'course_id', v_token.course_id, 'course_title', v_course.title);
END;
$$;

-- Storage bucket for content files
INSERT INTO storage.buckets (id, name, public) VALUES ('content', 'content', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', false);

-- Storage policies
CREATE POLICY "Public read on content" ON storage.objects FOR SELECT USING (bucket_id = 'content');
CREATE POLICY "Auth users upload content" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'content');
CREATE POLICY "Auth users update content" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'content');
CREATE POLICY "Public read on thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Auth users upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails');
CREATE POLICY "Public read on avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth users manage assignments" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'assignments');
