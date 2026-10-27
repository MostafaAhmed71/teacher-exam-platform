-- ========================================================
-- منصة الاختبارات للمعلمين - Supabase Database Schema & RLS
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TESTS TABLE
CREATE TABLE IF NOT EXISTS public.tests (
  id TEXT PRIMARY KEY, -- Unique generated code e.g. "Ab7K92xP"
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER, -- NULL means untimed
  show_correct_answers BOOLEAN DEFAULT TRUE,
  show_result BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'stopped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for test querying
CREATE INDEX IF NOT EXISTS idx_tests_teacher_id ON public.tests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);

-- 3. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  points NUMERIC NOT NULL DEFAULT 1,
  correct_answer TEXT NOT NULL, -- "a", "b", "c", "d" or "true", "false"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_test_id ON public.questions(test_id);

-- 4. QUESTION OPTIONS TABLE (for multiple_choice)
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_key TEXT NOT NULL, -- 'a', 'b', 'c', 'd'
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);

-- 5. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  attempt_identifier TEXT NOT NULL, -- Device/Browser unique token + Student key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_test_attempt UNIQUE (test_id, attempt_identifier)
);

CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_name ON public.attempts(student_name);

-- 6. ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Teacher Policies
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;
CREATE POLICY "Teachers can view their own profile"
  ON public.teachers FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;
CREATE POLICY "Teachers can update their own profile"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can manage their own tests" ON public.tests;
CREATE POLICY "Teachers can manage their own tests"
  ON public.tests FOR ALL
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can manage questions of their tests" ON public.questions;
CREATE POLICY "Teachers can manage questions of their tests"
  ON public.questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage question options" ON public.question_options;
CREATE POLICY "Teachers can manage question options"
  ON public.question_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.questions 
    JOIN public.tests ON tests.id = questions.test_id 
    WHERE questions.id = question_options.question_id AND tests.teacher_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Teachers can view attempts of their tests" ON public.attempts;
CREATE POLICY "Teachers can view attempts of their tests"
  ON public.attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tests WHERE tests.id = attempts.test_id AND tests.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can view answers of attempts of their tests" ON public.answers;
CREATE POLICY "Teachers can view answers of attempts of their tests"
  ON public.answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.attempts 
    JOIN public.tests ON tests.id = attempts.test_id 
    WHERE attempts.id = answers.attempt_id AND tests.teacher_id = auth.uid()
  ));

-- Public / Student Policies (Restricted)
DROP POLICY IF EXISTS "Public can view published tests basic details" ON public.tests;
CREATE POLICY "Public can view published tests basic details"
  ON public.tests FOR SELECT
  USING (status = 'published');

-- Note: Correct answers are NEVER accessible to public via Direct Select!
-- We restrict direct question select for students or handle it via secure RPC function.

-- ========================================================
-- SECURE RPC FUNCTIONS FOR STUDENT FLOW
-- ========================================================

-- Function 1: Get public test details for student (WITHOUT correct_answer!)
CREATE OR REPLACE FUNCTION public.get_public_test_details(p_test_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test RECORD;
  v_questions JSONB;
BEGIN
  -- Fetch test record
  SELECT id, title, subject, grade, description, duration_minutes, show_correct_answers, show_result, status
  INTO v_test
  FROM public.tests
  WHERE id = p_test_id;

  IF v_test IS NULL THEN
    RETURN jsonb_build_object('error', 'الاختبار غير موجود');
  END IF;

  IF v_test.status != 'published' THEN
    RETURN jsonb_build_object('error', 'هذا الاختبار غير متاّح حاليًا (غير منشور أو متوقف)');
  END IF;

  -- Fetch questions without correct_answer!
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'question_type', q.question_type,
      'points', q.points,
      'sort_order', q.sort_order,
      'options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'option_text', qo.option_text,
            'option_key', qo.option_key,
            'sort_order', qo.sort_order
          ) ORDER BY qo.sort_order ASC
        )
        FROM public.question_options qo
        WHERE qo.question_id = q.id
      )
    ) ORDER BY q.sort_order ASC
  )
  INTO v_questions
  FROM public.questions q
  WHERE q.test_id = p_test_id;

  RETURN jsonb_build_object(
    'test', jsonb_build_object(
      'id', v_test.id,
      'title', v_test.title,
      'subject', v_test.subject,
      'grade', v_test.grade,
      'description', v_test.description,
      'duration_minutes', v_test.duration_minutes,
      'show_correct_answers', v_test.show_correct_answers,
      'show_result', v_test.show_result
    ),
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$$;

-- Function 2: Check if student has already completed an attempt
CREATE OR REPLACE FUNCTION public.check_existing_attempt(p_test_id TEXT, p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.attempts
    WHERE test_id = p_test_id AND attempt_identifier = p_identifier AND status = 'completed'
  );
END;
$$;

-- Function 3: Server-side secure submit and auto-grading
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  p_test_id TEXT,
  p_student_name TEXT,
  p_grade TEXT,
  p_identifier TEXT,
  p_answers JSONB -- Map of question_id -> selected_answer
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test RECORD;
  v_q RECORD;
  v_selected_ans TEXT;
  v_is_correct BOOLEAN;
  v_score NUMERIC := 0;
  v_total_score NUMERIC := 0;
  v_percentage NUMERIC := 0;
  v_attempt_id UUID;
  v_rating TEXT;
  v_correct_count INT := 0;
  v_incorrect_count INT := 0;
  v_unanswered_count INT := 0;
  v_options JSONB;
  v_detailed_results JSONB := '[]'::jsonb;
BEGIN
  -- 1. Check test existence and status
  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id;
  IF v_test IS NULL THEN
    RAISE EXCEPTION 'الاختبار غير موجود';
  END IF;
  IF v_test.status != 'published' THEN
    RAISE EXCEPTION 'هذا الاختبار غير متاح حالياً للتسليم';
  END IF;

  -- 2. Check for duplicate submission
  IF EXISTS (SELECT 1 FROM public.attempts WHERE test_id = p_test_id AND attempt_identifier = p_identifier AND status = 'completed') THEN
    RAISE EXCEPTION 'لقد سبق لك أداء هذا الاختبار ولا يمكن إعادة المحاولة.';
  END IF;

  -- 3. Calculate scores and auto-grade
  FOR v_q IN SELECT * FROM public.questions WHERE test_id = p_test_id ORDER BY sort_order ASC LOOP
    v_total_score := v_total_score + v_q.points;
    v_selected_ans := p_answers->>v_q.id::text;

    IF v_selected_ans IS NULL OR TRIM(v_selected_ans) = '' THEN
      v_is_correct := FALSE;
      v_unanswered_count := v_unanswered_count + 1;
    ELSIF LOWER(TRIM(v_selected_ans)) = LOWER(TRIM(v_q.correct_answer)) THEN
      v_is_correct := TRUE;
      v_score := v_score + v_q.points;
      v_correct_count := v_correct_count + 1;
    ELSE
      v_is_correct := FALSE;
      v_incorrect_count := v_incorrect_count + 1;
    END IF;
  END LOOP;

  IF v_total_score > 0 THEN
    v_percentage := ROUND((v_score / v_total_score) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  -- Evaluation rating
  IF v_percentage >= 90 THEN
    v_rating := 'ممتاز';
  ELSIF v_percentage >= 80 THEN
    v_rating := 'جيد جداً';
  ELSIF v_percentage >= 70 THEN
    v_rating := 'جيد';
  ELSIF v_percentage >= 60 THEN
    v_rating := 'مقبول';
  ELSE
    v_rating := 'يحتاج إلى تحسين';
  END IF;

  -- 4. Create attempt row
  INSERT INTO public.attempts (
    test_id, student_name, grade, submitted_at, score, total_score, percentage, status, attempt_identifier
  ) VALUES (
    p_test_id, p_student_name, p_grade, NOW(), v_score, v_total_score, v_percentage, 'completed', p_identifier
  )
  RETURNING id INTO v_attempt_id;

  -- 5. Insert answers rows & detailed results JSON
  FOR v_q IN SELECT * FROM public.questions WHERE test_id = p_test_id ORDER BY sort_order ASC LOOP
    v_selected_ans := p_answers->>v_q.id::text;
    v_is_correct := (v_selected_ans IS NOT NULL AND LOWER(TRIM(v_selected_ans)) = LOWER(TRIM(v_q.correct_answer)));

    INSERT INTO public.answers (
      attempt_id, question_id, selected_answer, is_correct, points_earned
    ) VALUES (
      v_attempt_id, v_q.id, v_selected_ans, v_is_correct, CASE WHEN v_is_correct THEN v_q.points ELSE 0 END
    );

    -- Fetch question options if multiple choice
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', qo.id,
        'option_text', qo.option_text,
        'option_key', qo.option_key,
        'sort_order', qo.sort_order
      ) ORDER BY qo.sort_order ASC
    )
    INTO v_options
    FROM public.question_options qo
    WHERE qo.question_id = v_q.id;

    v_detailed_results := v_detailed_results || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_q.id,
        'question_text', v_q.question_text,
        'question_type', v_q.question_type,
        'selected_answer', COALESCE(v_selected_ans, ''),
        'correct_answer', v_q.correct_answer,
        'is_correct', v_is_correct,
        'points', v_q.points,
        'points_earned', CASE WHEN v_is_correct THEN v_q.points ELSE 0 END,
        'options', COALESCE(v_options, '[]'::jsonb)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'total_score', v_total_score,
    'percentage', v_percentage,
    'rating', v_rating,
    'correct_count', v_correct_count,
    'incorrect_count', v_incorrect_count,
    'unanswered_count', v_unanswered_count,
    'show_correct_answers', true,
    'show_result', v_test.show_result,
    'questions_review', v_detailed_results
  );
END;
$$;

-- Trigger to automatically create teacher record when user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'المعلم'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_teacher();

-- =========================================================================
-- نظام إدارة تراخيص تشغيل المواقع والتحقق على الخادم (License Management System)
-- =========================================================================

-- جدول ملاك المنصة (App Owners)
CREATE TABLE IF NOT EXISTS public.app_owners (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تراخيص العملاء (Client Licenses)
CREATE TABLE IF NOT EXISTS public.client_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL DEFAULT 'منصة مقياس للاختبارات',
  client_name TEXT NOT NULL DEFAULT 'الأستاذ عمرو حميصة',
  client_email TEXT,
  project_domain TEXT DEFAULT 'amr-exam-platform.vercel.app',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  suspension_reason TEXT DEFAULT 'تم انتهاء الحصة المجانية لقاعدة البيانات',
  notes TEXT,
  last_status_change TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_licenses_status ON public.client_licenses(status);

-- جدول سجل التدقيق (Audit Logs)
CREATE TABLE IF NOT EXISTS public.license_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.client_licenses(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  performed_by TEXT DEFAULT 'مالك المنصة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_audit_logs_license_id ON public.license_audit_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_license_audit_logs_created_at ON public.license_audit_logs(created_at DESC);

-- التحقق من صلاحيات المالك
CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_owners) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.app_owners
    WHERE id = auth.uid() OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_count INT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('is_owner', false, 'authenticated', false);
  END IF;

  v_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
  SELECT COUNT(*) INTO v_count FROM public.app_owners;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('is_owner', true, 'authenticated', true, 'is_initial_setup', true, 'email', v_email);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.app_owners
    WHERE id = auth.uid() OR LOWER(email) = v_email
  ) INTO v_is_owner;

  RETURN jsonb_build_object('is_owner', v_is_owner, 'authenticated', true, 'is_initial_setup', false, 'email', v_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_initial_owner()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.app_owners;
  v_email := LOWER(COALESCE(auth.jwt()->>'email', ''));

  IF v_count = 0 OR NOT EXISTS (SELECT 1 FROM public.app_owners WHERE id = auth.uid() OR LOWER(email) = v_email) THEN
    INSERT INTO public.app_owners (id, email)
    VALUES (auth.uid(), v_email)
    ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id;

    RETURN jsonb_build_object('success', true, 'message', 'تم تعيينك كمالك رئيسي بنجاح');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'أنت مسجل بالفعل كمالك');
END;
$$;

-- التحقق من حالة ترخيص المنصة
CREATE OR REPLACE FUNCTION public.is_platform_license_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_suspended BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.client_licenses WHERE status = 'suspended'
  ) INTO v_is_suspended;

  RETURN NOT v_is_suspended;
END;
$$;

-- تريجر التدقيق الآلي
CREATE OR REPLACE FUNCTION public.log_license_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    v_user_email := COALESCE(auth.jwt()->>'email', 'مالك المنصة');

    INSERT INTO public.license_audit_logs (
      license_id,
      client_name,
      previous_status,
      new_status,
      reason,
      performed_by
    ) VALUES (
      NEW.id,
      NEW.client_name,
      OLD.status,
      NEW.status,
      COALESCE(NEW.suspension_reason, 'تم التعديل بواسطة المالك'),
      v_user_email
    );

    NEW.last_status_change := NOW();
    NEW.updated_at := NOW();
  ELSIF (TG_OP = 'UPDATE') THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_license_status_audit ON public.client_licenses;
CREATE TRIGGER trg_license_status_audit
  BEFORE UPDATE ON public.client_licenses
  FOR EACH ROW EXECUTE FUNCTION public.log_license_status_change();

-- تريجرات الحظر الفوري على الخادم عند إيقاف الترخيص
CREATE OR REPLACE FUNCTION public.enforce_license_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_platform_license_active() THEN
    RAISE EXCEPTION 'تم انتهاء الحصة المجانية لقاعدة البيانات';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_license_tests ON public.tests;
CREATE TRIGGER trg_enforce_license_tests
  BEFORE INSERT OR UPDATE OR DELETE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

DROP TRIGGER IF EXISTS trg_enforce_license_questions ON public.questions;
CREATE TRIGGER trg_enforce_license_questions
  BEFORE INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

DROP TRIGGER IF EXISTS trg_enforce_license_question_options ON public.question_options;
CREATE TRIGGER trg_enforce_license_question_options
  BEFORE INSERT OR UPDATE OR DELETE ON public.question_options
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

DROP TRIGGER IF EXISTS trg_enforce_license_attempts ON public.attempts;
CREATE TRIGGER trg_enforce_license_attempts
  BEFORE INSERT ON public.attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

-- تفعيل RLS
ALTER TABLE public.app_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view client licenses" ON public.client_licenses;
CREATE POLICY "Public can view client licenses"
  ON public.client_licenses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only owners can manage client licenses" ON public.client_licenses;
CREATE POLICY "Only owners can manage client licenses"
  ON public.client_licenses FOR ALL
  USING (public.is_current_user_owner())
  WITH CHECK (public.is_current_user_owner());

DROP POLICY IF EXISTS "Only owners can view audit logs" ON public.license_audit_logs;
CREATE POLICY "Only owners can view audit logs"
  ON public.license_audit_logs FOR SELECT
  USING (public.is_current_user_owner());

-- السجل الافتراضي للترخيص
INSERT INTO public.client_licenses (
  project_name,
  client_name,
  project_domain,
  status,
  suspension_reason
)
SELECT
  'منصة مقياس للاختبارات',
  'الأستاذ عمرو حميصة',
  'amr-exam-platform.vercel.app',
  'active',
  'تم انتهاء الحصة المجانية لقاعدة البيانات'
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_licenses
);

