import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../services/studentService';
import type { Test, StudentQuestion, SubmissionPayload } from '../types';
import { formatTime } from '../utils/helpers';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Clock, ArrowRight, ArrowLeft, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const StudentTestExam: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [studentInfo, setStudentInfo] = useState<{
    studentName: string;
    studentGrade: string;
    identifier: string;
  } | null>(null);

  // Exam taking state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!testId) return;

    // Check student session info from entrance step
    const stored = sessionStorage.getItem(`student_info_${testId}`);
    if (!stored) {
      showToast('يرجى إدخال اسمك أولاً قبل بدء الاختبار', 'error');
      navigate(`/test/${testId}`);
      return;
    }

    const info = JSON.parse(stored);
    setStudentInfo(info);

    loadTestAndQuestions(testId);

    // Restore draft answers if available
    const draft = studentService.loadDraftAnswers(testId);
    if (draft) {
      setAnswers(draft);
    }
  }, [testId]);

  const loadTestAndQuestions = async (tId: string) => {
    setLoading(true);
    try {
      const { test: testData, questions: qData, error } = await studentService.getPublicTest(tId);
      if (error || !testData) {
        showToast(error || 'فشل تحميل الاختبار', 'error');
        navigate(`/test/${tId}`);
        return;
      }

      setTest(testData);
      setQuestions(qData);

      // Initialize Timer if test has duration
      if (testData.duration_minutes && testData.duration_minutes > 0) {
        const totalSecs = testData.duration_minutes * 60;
        setRemainingSeconds(totalSecs);
      }
    } catch (err) {
      showToast('خطأ أثناء تحميل الأسئلة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Timer Interval Effect
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmitTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remainingSeconds !== null]);

  // Handle Option Select
  const handleSelectOption = (questionId: string, selectedValue: string) => {
    const updated = { ...answers, [questionId]: selectedValue };
    setAnswers(updated);
    if (testId) {
      studentService.saveDraftAnswers(testId, updated);
    }
  };

  // Handle Auto Submit when Timer hits 0
  const handleAutoSubmitTimeUp = () => {
    showToast('انتهى الوقت المحدد للاختبار! جاري تسليم الإجابات تلقائيًا...', 'info');
    executeFinalSubmission();
  };

  // Execute Submission to Backend
  const executeFinalSubmission = async () => {
    if (!testId || !studentInfo || submitting) return;

    setSubmitting(true);
    try {
      const payload: SubmissionPayload = {
        test_id: testId,
        student_name: studentInfo.studentName,
        grade: studentInfo.studentGrade,
        identifier: studentInfo.identifier,
        answers,
      };

      const { result, error } = await studentService.submitAttempt(payload);

      if (error || !result) {
        showToast(error || 'فشل تسليم الاختبار', 'error');
        setSubmitting(false);
        return;
      }

      // Clear local draft and session
      studentService.clearDraftAnswers(testId);
      sessionStorage.setItem(`result_${result.attempt_id}`, JSON.stringify(result));

      showToast('تم تسليم الاختبار بنجاح والتصحيح بنجاح', 'success');
      navigate(`/test/${testId}/result/${result.attempt_id}`, { replace: true });
    } catch (err: any) {
      showToast('حدث خطأ أثناء تسليم الاختبار', 'error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-bold text-lg">جاري تجهيز ورقة الأسئلة...</p>
      </div>
    );
  }

  if (!test || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimerLow = remainingSeconds !== null && remainingSeconds <= 120;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Top Fixed Bar */}
      <div className="max-w-4xl w-full mx-auto space-y-4">
        
        <div className="bg-navy-900 text-white p-4 sm:p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-navy-800">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight break-words">{test.title}</h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5 break-words">
              الطالب: <strong>{studentInfo?.studentName}</strong> | الصف: <strong>{studentInfo?.studentGrade}</strong>
            </p>
          </div>

          {/* Countdown Timer Badge */}
          {remainingSeconds !== null && (
            <div
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-sm shrink-0 self-start sm:self-auto transition-all ${
                isTimerLow
                  ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-navy-800 text-gold-400 border-navy-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          )}
        </div>

        {/* Question Navigation Index Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
            <span>الأسئلة:</span>
            <span className="text-navy-900 font-extrabold">{answeredCount} من {questions.length} مُجاب</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-gold-500 text-navy-950 ring-2 ring-gold-400'
                      : isAnswered
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Main Question Execution Box */}
      <div className="max-w-4xl w-full mx-auto my-6">
        <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-lg border border-slate-100 space-y-6">
          
          {/* Question Title & Points Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-navy-900 text-gold-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                {currentIndex + 1}
              </span>
              <span className="text-xs font-bold text-slate-400">السؤال {currentIndex + 1} من {questions.length}</span>
            </div>

            <span className="self-start sm:self-auto px-3 py-1 bg-slate-100 text-navy-900 font-bold text-xs rounded-full">
              الدرجة المستحقة: {currentQuestion.points}
            </span>
          </div>

          {/* Question Text */}
          <h2 className="text-lg sm:text-xl font-bold text-navy-900 leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          {/* Multiple Choice Options */}
          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.option_key;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.option_key)}
                    className={`w-full flex items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border-2 text-right transition-all font-semibold text-sm ${
                      isSelected
                        ? 'bg-navy-900 text-white border-navy-900 shadow-md'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg text-xs font-extrabold uppercase flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-gold-500 text-navy-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.option_key}
                      </span>
                      <span className="break-words leading-relaxed">{opt.option_text}</span>
                    </div>

                    {isSelected && <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0 mt-0.5 sm:mt-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False Options */}
          {currentQuestion.question_type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleSelectOption(currentQuestion.id, 'true')}
                className={`p-5 rounded-2xl border-2 font-extrabold text-base text-center transition-all ${
                  answers[currentQuestion.id] === 'true'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                صح
              </button>

              <button
                type="button"
                onClick={() => handleSelectOption(currentQuestion.id, 'false')}
                className={`p-5 rounded-2xl border-2 font-extrabold text-base text-center transition-all ${
                  answers[currentQuestion.id] === 'false'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                خطأ
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Footer Navigation Bar */}
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white p-3 sm:p-4 rounded-3xl shadow-lg border border-slate-100 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Previous Question Button */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="px-3 sm:px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-30 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          {/* Next / Submit Button */}
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-4 sm:px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              className="px-3 sm:px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">إنهاء وتسليم الاختبار</span>
              <span className="sm:hidden">تسليم</span>
            </button>
          )}

        </div>
      </div>

      {/* Confirmation Modal before Final Submit */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="تأكيد إنهاء الاختبار"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-base font-extrabold text-navy-900">هل أنت متأكد من إنهاء الاختبار؟</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              لقد أجبت عن <strong>{answeredCount} من إجمالي {questions.length} أسئلة</strong>.
              <br />
              لن تتمكن من تعديل إجاباتك بعد الإرسال النهائي.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              العودة لمراجعة الأسئلة
            </button>
            
            <button
              type="button"
              disabled={submitting}
              onClick={executeFinalSubmission}
              className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-gold-500 rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 text-gold-400" />
                  <span>تأكيد التسليم النهائي</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
