-- =========================================================================
-- نظام إدارة تراخيص تشغيل المواقع والتحقق على الخادم (License Management System)
-- =========================================================================

-- 1. جدول ملاك المنصة (App Owners)
CREATE TABLE IF NOT EXISTS public.app_owners (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول تراخيص العملاء (Client Licenses)
CREATE TABLE IF NOT EXISTS public.client_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL DEFAULT 'منصة مقياس للاختبارات',
  client_name TEXT NOT NULL DEFAULT 'الأستاذ عمرو هميسة
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

-- 3. جدول سجل التدقيق (Audit Logs) لتسجيل كل تغيير في التراخيص
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

-- =========================================================================
-- دوال التحقق من المالك وحالة الترخيص على الخادم
-- =========================================================================

-- دالة فحص ما إذا كان المستخدم الحالي مالكاً للمنصة
CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا لم يكن هناك أي مالك مسجل بعد، فإن النظام في وضع التهيئة الأولى
  IF NOT EXISTS (SELECT 1 FROM public.app_owners) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.app_owners
    WHERE id = auth.uid() OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
  );
END;
$$;

-- دالة للتحقق من حالة صلاحية المالك مع إرجاع معلومات تفصيلية
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
    RETURN jsonb_build_object(
      'is_owner', false,
      'authenticated', false
    );
  END IF;

  v_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
  SELECT COUNT(*) INTO v_count FROM public.app_owners;

  -- إذا لم يوجد ملاك مسجلين في الجدول، نتيح للمستخدم الحالي تسجيل نفسه كمالك رئيسي
  IF v_count = 0 THEN
    RETURN jsonb_build_object(
      'is_owner', true,
      'authenticated', true,
      'is_initial_setup', true,
      'email', v_email
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.app_owners
    WHERE id = auth.uid() OR LOWER(email) = v_email
  ) INTO v_is_owner;

  RETURN jsonb_build_object(
    'is_owner', v_is_owner,
    'authenticated', true,
    'is_initial_setup', false,
    'email', v_email
  );
END;
$$;

-- دالة لتسجيل المالك الأولي للمنصة
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

-- دالة فحص ما إذا كان ترخيص المنصة نشطاً
CREATE OR REPLACE FUNCTION public.is_platform_license_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_suspended BOOLEAN;
BEGIN
  -- إذا وُجد أي ترخيص مسجل بحالة 'suspended'، يُعتبر تشغيل العمليات المحمية متوقفاً
  SELECT EXISTS (
    SELECT 1 FROM public.client_licenses WHERE status = 'suspended'
  ) INTO v_is_suspended;

  RETURN NOT v_is_suspended;
END;
$$;

-- =========================================================================
-- تريجر التدقيق الآلي (Audit Trigger)
-- =========================================================================

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

-- =========================================================================
-- تريجرات الحظر على مستوى الخادم عند إيقاف الترخيص
-- =========================================================================

CREATE OR REPLACE FUNCTION public.enforce_license_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا كان الترخيص متوقفاً، يتم منع العمليات المحمية وإرجاع رسالة الخطأ الرسمية
  IF NOT public.is_platform_license_active() THEN
    RAISE EXCEPTION 'تم انتهاء الحصة المجانية لقاعدة البيانات';
  END IF;
  RETURN NEW;
END;
$$;

-- حظر إنشاء وتعديل وحذف الاختبارات عند انتهاء الترخيص
DROP TRIGGER IF EXISTS trg_enforce_license_tests ON public.tests;
CREATE TRIGGER trg_enforce_license_tests
  BEFORE INSERT OR UPDATE OR DELETE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

-- حظر إنشاء وتعديل وحذف الأسئلة عند انتهاء الترخيص
DROP TRIGGER IF EXISTS trg_enforce_license_questions ON public.questions;
CREATE TRIGGER trg_enforce_license_questions
  BEFORE INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

-- حظر خيارات الأسئلة
DROP TRIGGER IF EXISTS trg_enforce_license_question_options ON public.question_options;
CREATE TRIGGER trg_enforce_license_question_options
  BEFORE INSERT OR UPDATE OR DELETE ON public.question_options
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

-- حظر تسجيل محاولات جديدة للطلاب عند انتهاء الترخيص
DROP TRIGGER IF EXISTS trg_enforce_license_attempts ON public.attempts;
CREATE TRIGGER trg_enforce_license_attempts
  BEFORE INSERT ON public.attempts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_license_quota();

-- =========================================================================
-- تحديث دالة submit_test_attempt للتحقق من الترخيص على الخادم
-- =========================================================================

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
  -- 0. التحقق من صلاحية ترخيص الموقع على الخادم
  IF NOT public.is_platform_license_active() THEN
    RAISE EXCEPTION 'تم انتهاء الحصة المجانية لقاعدة البيانات';
  END IF;

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

-- =========================================================================
-- سياسات الأمان Row Level Security (RLS)
-- =========================================================================

ALTER TABLE public.app_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. سياسات app_owners
DROP POLICY IF EXISTS "Owners can view owners" ON public.app_owners;
CREATE POLICY "Owners can view owners"
  ON public.app_owners FOR SELECT
  USING (public.is_current_user_owner());

DROP POLICY IF EXISTS "Owners can insert owners" ON public.app_owners;
CREATE POLICY "Owners can insert owners"
  ON public.app_owners FOR INSERT
  WITH CHECK (public.is_current_user_owner());

-- 2. سياسات client_licenses
-- قراءة الترخيص متاحة للجميع لمعرفة حالة تشغيل الموقع
DROP POLICY IF EXISTS "Public can view client licenses" ON public.client_licenses;
CREATE POLICY "Public can view client licenses"
  ON public.client_licenses FOR SELECT
  USING (true);

-- التعديل والإضافة والحذف محصور فقط بالمالك
DROP POLICY IF EXISTS "Only owners can insert client licenses" ON public.client_licenses;
CREATE POLICY "Only owners can insert client licenses"
  ON public.client_licenses FOR INSERT
  WITH CHECK (public.is_current_user_owner());

DROP POLICY IF EXISTS "Only owners can update client licenses" ON public.client_licenses;
CREATE POLICY "Only owners can update client licenses"
  ON public.client_licenses FOR UPDATE
  USING (public.is_current_user_owner())
  WITH CHECK (public.is_current_user_owner());

DROP POLICY IF EXISTS "Only owners can delete client licenses" ON public.client_licenses;
CREATE POLICY "Only owners can delete client licenses"
  ON public.client_licenses FOR DELETE
  USING (public.is_current_user_owner());

-- 3. سياسات license_audit_logs
DROP POLICY IF EXISTS "Only owners can view audit logs" ON public.license_audit_logs;
CREATE POLICY "Only owners can view audit logs"
  ON public.license_audit_logs FOR SELECT
  USING (public.is_current_user_owner());

DROP POLICY IF EXISTS "Only owners can insert audit logs" ON public.license_audit_logs;
CREATE POLICY "Only owners can insert audit logs"
  ON public.license_audit_logs FOR INSERT
  WITH CHECK (public.is_current_user_owner());

-- =========================================================================
-- إدخال السجل الافتراضي للترخيص الحالي
-- =========================================================================

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
