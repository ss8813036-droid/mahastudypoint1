
-- Create a secure view for test questions that hides correct_option from students
CREATE OR REPLACE FUNCTION public.get_test_questions_safe(p_test_id uuid)
RETURNS TABLE (
  id uuid,
  test_id uuid,
  question text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  sort_order integer,
  correct_option character(1)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and teachers get full data including correct_option
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher') THEN
    RETURN QUERY
      SELECT tq.id, tq.test_id, tq.question, tq.option_a, tq.option_b, tq.option_c, tq.option_d, tq.sort_order, tq.correct_option
      FROM public.test_questions tq
      WHERE tq.test_id = p_test_id;
  ELSE
    -- Students: only if enrolled and test is published, and hide correct_option
    -- But if they already submitted, show correct answers
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
          AND t.course_id IN (SELECT e.course_id FROM public.enrollments e WHERE e.user_id = auth.uid());
    END IF;
  END IF;
END;
$$;
