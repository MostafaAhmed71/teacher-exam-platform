import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../services/studentService';
import type { Test, StudentQuestion } from '../types';
import { getDeviceFingerprint } from '../utils/helpers';
import { useToast } from '../components/Toast';
import { Clock, FileText, User, BookOpen, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export const StudentTestLanding: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student Input State
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [isCheckingAttempt, setIsCheckingAttempt] = useState(false);
  const [hasAlreadyTaken, setHasAlreadyTaken] = useState(false);

  useEffect(() => {
    if (testId) {
      loadTest(testId);
    }
  }, [testId]);

  const loadTest = async (tId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { test: testData, questions: qData, error } = await studentService.getPublicTest(tId);
      if (error || !testData) {
        setErrorMessage(error || 'عذراً، هذا الاختبار غير موجود أو تم إيقافه.');
        return;
      }
      setTest(testData);
      setQuestions(qData);
      setStudentGrade(testData.grade || '');
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء تحميل الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      showToast('يرجى كتابة الاسم الثلاثي', 'error');
      return;
    }

    if (!studentGrade.trim()) {
      showToast('يرجى تحديد أو إدخال الصف الدراسِي', 'error');
      return;
    }

    if (!testId || !test) return;

    setIsCheckingAttempt(true);
    
    // Generate device/session unique identifier
    const deviceId = getDeviceFingerprint();
    const identifier = `${studentName.trim().toLowerCase()}_${studentGrade.trim().toLowerCase()}_${deviceId}`;

    try {
      // Server-side check if attempt already exists!
      const alreadyTaken = await studentService.checkExistingAttempt(testId, identifier);
      
      if (alreadyTaken) {
        setHasAlreadyTaken(true);
        setIsCheckingAttempt(false);
        return;
      }

      // Store student info in session for exam execution
      sessionStorage.setItem(`student_info_${testId}`, JSON.stringify({
        studentName: studentName.trim(),
        studentGrade: studentGrade.trim(),
        identifier,
        startedAt: new Date().toISOString()
      }));

      navigate(`/test/${testId}/start`);
    } catch (err) {
      showToast('حدث خطأ في التحقق من إمكانية بدء الاختبار', 'error');
    } finally {
      setIsCheckingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-bold text-lg">جاري تجهيز الاختبار...</p>
      </div>
    );
  }

  if (errorMessage || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-navy-900">تنبيه النظام</h2>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        
        {/* Top Header Card */}
        <div className="bg-navy-900 text-white p-6 sm:p-8 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-500 text-navy-950">
              اختبار إلكتروني
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مُصحح تلقائيًا</span>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">{test.title}</h1>
          <p className="text-xs text-slate-300 font-medium">المادة: {test.subject} | الصف: {test.grade}</p>
        </div>

        {/* Test Info Badges */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-navy-900 shrink-0" />
              <span>عدد الأسئلة: <strong>{questions.length} سؤال</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-600 shrink-0" />
              <span>
                المدة المحددَة: <strong>{test.duration_minutes ? `${test.duration_minutes} دقيقة` : 'بدون مؤقت'}</strong>
              </span>
            </div>
          </div>

          {test.description && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
              <strong className="block font-bold">تعليمات الاختبار:</strong>
              <p>{test.description}</p>
            </div>
          )}

          {/* Double Taking Blocked Warning Banner */}
          {hasAlreadyTaken ? (
            <div className="bg-rose-50 border-2 border-rose-300 p-6 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-rose-900">عذرًا، تعذر بدء الاختبار</h3>
              <p className="text-xs font-bold text-rose-800 leading-relaxed">
                لقد سبق لك أداء هذا الاختبار ولا يمكن إعادة المحاولة.
              </p>
              <p className="text-[11px] text-slate-500">تم تسجيل إجابتك السابقة بنجاح في النظام.</p>
            </div>
          ) : (
            /* Student Entrance Form */
            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالب / الطالبة الثلاثي *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full pr-9 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الصف / الفصل الدراسِي *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    placeholder="اختر أو اكتب صفك"
                    className="w-full pr-9 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCheckingAttempt}
                className="w-full py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-2"
              >
                {isCheckingAttempt ? (
                  <div className="w-5 h-5 border-2 border-white border-t-gold-500 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>بدء الاختبار الآن</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
