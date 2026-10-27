-- Run once in the SQL Editor of the existing project, after schema.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_license_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_platform_license_active() THEN
    RAISE EXCEPTION 'تم انتهاء الحصة المجانية لقاعدة البيانات';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.test_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  max_uses INTEGER NOT NULL CHECK (max_uses BETWEEN 1 AND 1000000),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, code)
);
ALTER TABLE public.test_access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_access_codes ON public.test_access_codes;
CREATE POLICY teacher_access_codes ON public.test_access_codes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.teacher_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.teacher_id = (SELECT auth.uid())));
-- Teachers may create and revoke codes. Usage counts are server-managed.
GRANT SELECT, DELETE ON public.test_access_codes TO authenticated;
REVOKE INSERT, UPDATE ON public.test_access_codes FROM anon, authenticated;
GRANT INSERT (test_id, max_uses) ON public.test_access_codes TO authenticated;
REVOKE ALL ON public.test_access_codes FROM anon;

CREATE SCHEMA IF NOT EXISTS exam_private;
REVOKE ALL ON SCHEMA exam_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS exam_private.sessions (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.test_access_codes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE exam_private.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON exam_private.sessions FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_exam_sessions_code ON exam_private.sessions(code_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_test ON exam_private.sessions(test_id);

-- Preserve the existing grading/details implementation behind a private API.
-- Conditional moves allow this upgrade script to be run again safely.
DO $$ BEGIN
  IF to_regprocedure('exam_private.get_public_test_details(text)') IS NULL THEN
    ALTER FUNCTION public.get_public_test_details(TEXT) SET SCHEMA exam_private;
  END IF;
  IF to_regprocedure('exam_private.submit_test_attempt(text,text,text,text,jsonb)') IS NULL THEN
    ALTER FUNCTION public.submit_test_attempt(TEXT,TEXT,TEXT,TEXT,JSONB) SET SCHEMA exam_private;
  END IF;
END $$;
ALTER FUNCTION exam_private.get_public_test_details(TEXT) SET search_path = '';
ALTER FUNCTION exam_private.submit_test_attempt(TEXT,TEXT,TEXT,TEXT,JSONB) SET search_path = '';
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA exam_private FROM PUBLIC, anon, authenticated;

-- The link alone returns metadata only; questions require a valid session.
CREATE OR REPLACE FUNCTION public.get_public_test_details(p_test_id TEXT)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object('test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'subject', t.subject, 'grade', t.grade,
      'description', t.description, 'duration_minutes', t.duration_minutes,
      'show_result', t.show_result, 'show_correct_answers', t.show_correct_answers,
      'questions_count', (SELECT count(*) FROM public.questions q WHERE q.test_id = t.id)
    ), 'questions', '[]'::jsonb)
    FROM public.tests t WHERE t.id = p_test_id AND t.status = 'published'
  ), jsonb_build_object('error', 'الاختبار غير موجود أو غير متاح حالياً'));
$$;

CREATE OR REPLACE FUNCTION public.redeem_test_code(
  p_test_id TEXT, p_code TEXT, p_student_name TEXT, p_grade TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_code public.test_access_codes; v_test public.tests; v_token UUID;
BEGIN
  IF NOT public.is_platform_license_active() THEN RAISE EXCEPTION 'المنصة متوقفة حالياً'; END IF;
  IF nullif(trim(p_student_name), '') IS NULL OR nullif(trim(p_grade), '') IS NULL THEN
    RAISE EXCEPTION 'يرجى إدخال الاسم والصف';
  END IF;
  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id AND status = 'published' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الاختبار غير متاح حالياً'; END IF;
  -- Row lock makes the limit exact even when students start simultaneously.
  SELECT * INTO v_code FROM public.test_access_codes
    WHERE test_id = p_test_id AND code = trim(p_code) FOR UPDATE;
  IF NOT FOUND OR v_code.used_count >= v_code.max_uses THEN
    RAISE EXCEPTION 'كود التفعيل غير صحيح أو تم استهلاك عدد مرات استخدامه';
  END IF;
  UPDATE public.test_access_codes SET used_count = used_count + 1 WHERE id = v_code.id;
  INSERT INTO exam_private.sessions(test_id, code_id, student_name, grade, expires_at)
    VALUES (p_test_id, v_code.id, trim(p_student_name), trim(p_grade),
      now() + make_interval(mins => COALESCE(v_test.duration_minutes, 1440))) RETURNING token INTO v_token;
  RETURN jsonb_build_object('token', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_activated_test(p_test_id TEXT, p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_data JSONB; v_session exam_private.sessions;
BEGIN
  SELECT * INTO v_session FROM exam_private.sessions
    WHERE token = p_token AND test_id = p_test_id AND NOT submitted AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'جلسة الاختبار غير صالحة أو انتهت؛ أدخل كود التفعيل'; END IF;
  v_data := exam_private.get_public_test_details(p_test_id);
  RETURN v_data || jsonb_build_object('expires_at', v_session.expires_at);
END;
$$;

-- Keep the existing public signature, using the unguessable session token as identifier.
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  p_test_id TEXT, p_student_name TEXT, p_grade TEXT, p_identifier TEXT, p_answers JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_session exam_private.sessions; v_result JSONB;
BEGIN
  SELECT * INTO v_session FROM exam_private.sessions
    WHERE token::text = p_identifier AND test_id = p_test_id FOR UPDATE;
  IF NOT FOUND OR v_session.submitted OR v_session.expires_at + interval '1 minute' < now() THEN
    RAISE EXCEPTION 'جلسة الاختبار غير صالحة أو تم تسليمها بالفعل';
  END IF;
  -- Name/grade are bound at activation and cannot be substituted on submission.
  v_result := exam_private.submit_test_attempt(p_test_id, v_session.student_name,
    v_session.grade, p_identifier, p_answers);
  UPDATE exam_private.sessions SET submitted = true WHERE token = v_session.token;
  RETURN v_result;
END;
$$;

-- Update questions atomically, preserving IDs and historical answers for retained questions.
CREATE OR REPLACE FUNCTION public.save_test_questions(p_test_id TEXT, p_questions JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_q JSONB; v_opt JSONB; v_id UUID; v_ids UUID[] := '{}'; v_order INT := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tests WHERE id = p_test_id AND teacher_id = auth.uid()
  ) THEN RAISE EXCEPTION 'لا تملك صلاحية تعديل الاختبار'; END IF;
  FOR v_q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    v_order := v_order + 1;
    SELECT id INTO v_id FROM public.questions WHERE test_id = p_test_id AND id::text = v_q->>'id';
    IF v_id IS NULL THEN
      INSERT INTO public.questions(test_id, question_text, question_type, points, correct_answer, sort_order)
      VALUES (p_test_id, v_q->>'question_text', v_q->>'question_type', (v_q->>'points')::numeric,
        v_q->>'correct_answer', v_order) RETURNING id INTO v_id;
    ELSE
      UPDATE public.questions SET question_text = v_q->>'question_text', question_type = v_q->>'question_type',
        points = (v_q->>'points')::numeric, correct_answer = v_q->>'correct_answer', sort_order = v_order
        WHERE id = v_id;
    END IF;
    v_ids := array_append(v_ids, v_id);
    DELETE FROM public.question_options WHERE question_id = v_id;
    FOR v_opt IN SELECT value FROM jsonb_array_elements(COALESCE(v_q->'options', '[]'::jsonb)) LOOP
      INSERT INTO public.question_options(question_id, option_text, option_key, sort_order)
        VALUES (v_id, v_opt->>'option_text', v_opt->>'option_key', (v_opt->>'sort_order')::int);
    END LOOP;
  END LOOP;
  DELETE FROM public.questions WHERE test_id = p_test_id AND NOT (id = ANY(v_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_test_details(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_test_code(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_activated_test(TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_test_attempt(TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_test_questions(TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_test_details(TEXT), public.redeem_test_code(TEXT,TEXT,TEXT,TEXT),
  public.get_activated_test(TEXT,UUID), public.submit_test_attempt(TEXT,TEXT,TEXT,TEXT,JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_test_questions(TEXT,JSONB) TO authenticated;
COMMIT;
