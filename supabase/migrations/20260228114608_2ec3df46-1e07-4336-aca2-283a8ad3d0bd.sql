-- Drop the permissive policy that lets enrolled students SELECT test_questions directly (exposing correct_option)
DROP POLICY IF EXISTS "Enrolled users can see questions for published tests" ON public.test_questions;

-- Students must use the get_test_questions_safe RPC function instead.
-- Admins and teachers retain direct access via their existing ALL policies.