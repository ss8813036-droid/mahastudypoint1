
-- Fix: Add expires_at check to ALL enrollment-based RLS policies

-- 1. CONTENT: "Enrolled users can see paid content"
DROP POLICY IF EXISTS "Enrolled users can see paid content" ON public.content;
CREATE POLICY "Enrolled users can see paid content" ON public.content FOR SELECT TO authenticated USING (
  course_id IN (
    SELECT course_id FROM public.enrollments
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- 2. FOLDERS: "Enrolled users can see folders"
DROP POLICY IF EXISTS "Enrolled users can see folders" ON public.folders;
CREATE POLICY "Enrolled users can see folders" ON public.folders FOR SELECT TO authenticated USING (
  (course_id IN (
    SELECT course_id FROM public.enrollments
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'teacher'::app_role) AND course_id IN (
    SELECT id FROM public.courses WHERE created_by = auth.uid()
  ))
);

-- 3. CHAT_MESSAGES: "Enrolled users can read chat"
DROP POLICY IF EXISTS "Enrolled users can read chat" ON public.chat_messages;
CREATE POLICY "Enrolled users can read chat" ON public.chat_messages FOR SELECT TO authenticated USING (
  (course_id IN (
    SELECT course_id FROM public.enrollments
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'teacher'::app_role) AND course_id IN (
    SELECT id FROM public.courses WHERE created_by = auth.uid()
  ))
);

-- 4. CHAT_MESSAGES: "Enrolled users can send messages"
DROP POLICY IF EXISTS "Enrolled users can send messages" ON public.chat_messages;
CREATE POLICY "Enrolled users can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() = user_id) AND (
    (course_id IN (
      SELECT course_id FROM public.enrollments
      WHERE user_id = auth.uid()
      AND (expires_at IS NULL OR expires_at > now())
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'teacher'::app_role) AND course_id IN (
      SELECT id FROM public.courses WHERE created_by = auth.uid()
    ))
  )
);

-- 5. TESTS: "Enrolled users can see published tests"
DROP POLICY IF EXISTS "Enrolled users can see published tests" ON public.tests;
CREATE POLICY "Enrolled users can see published tests" ON public.tests FOR SELECT TO authenticated USING (
  (is_published = true) AND course_id IN (
    SELECT course_id FROM public.enrollments
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- 6. ASSIGNMENTS: "Enrolled users can see published assignments"
DROP POLICY IF EXISTS "Enrolled users can see published assignments" ON public.assignments;
CREATE POLICY "Enrolled users can see published assignments" ON public.assignments FOR SELECT TO authenticated USING (
  (is_published = true) AND course_id IN (
    SELECT course_id FROM public.enrollments
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- 7. ASSIGNMENT_SUBMISSIONS: "Users can submit assignments" - check enrollment expiry
DROP POLICY IF EXISTS "Users can submit assignments" ON public.assignment_submissions;
CREATE POLICY "Users can submit assignments" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() = user_id) AND (
    assignment_id IN (
      SELECT a.id FROM public.assignments a
      WHERE a.course_id IN (
        SELECT course_id FROM public.enrollments
        WHERE user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > now())
      )
    )
  )
);

-- 8. Update get_test_questions_safe function to check expiry
CREATE OR REPLACE FUNCTION public.get_test_questions_safe(p_test_id uuid)
 RETURNS TABLE(id uuid, test_id uuid, question text, option_a text, option_b text, option_c text, option_d text, sort_order integer, correct_option character)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher') THEN
    RETURN QUERY
      SELECT tq.id, tq.test_id, tq.question, tq.option_a, tq.option_b, tq.option_c, tq.option_d, tq.sort_order, tq.correct_option
      FROM public.test_questions tq
      WHERE tq.test_id = p_test_id;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.test_submissions ts
      WHERE ts.test_id = p_test_id AND ts.user_id = auth.uid()
    ) THEN
      RETURN QUERY
        SELECT tq.id, tq.test_id, tq.question, tq.option_a, tq.option_b, tq.option_c, tq.option_d, tq.sort_order, tq.correct_option
        FROM public.test_questions tq
        WHERE tq.test_id = p_test_id;
    ELSE
      RETURN QUERY
        SELECT tq.id, tq.test_id, tq.question, tq.option_a, tq.option_b, tq.option_c, tq.option_d, tq.sort_order, NULL::character(1) as correct_option
        FROM public.test_questions tq
        JOIN public.tests t ON t.id = tq.test_id
        WHERE tq.test_id = p_test_id
          AND t.is_published = true
          AND t.course_id IN (
            SELECT e.course_id FROM public.enrollments e
            WHERE e.user_id = auth.uid()
            AND (e.expires_at IS NULL OR e.expires_at > now())
          );
    END IF;
  END IF;
END;
$function$;
