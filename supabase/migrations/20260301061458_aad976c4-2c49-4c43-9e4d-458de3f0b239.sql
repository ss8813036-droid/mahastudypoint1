
-- Fix token redemption race condition: check existing enrollment before marking token used
CREATE OR REPLACE FUNCTION public.redeem_token(token_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Check if user is already enrolled (prevents race condition)
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = v_user_id AND course_id = v_token.course_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already enrolled in this course');
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
$function$;
