import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { testService } from '../services/testService';
import type { Attempt, Question } from '../types';
import { formatDateArabic } from '../utils/helpers';
import { useToast } from '../components/Toast';
import { ArrowLeft, User, Printer } from 'lucide-react';

export const StudentAttemptReport: React.FC = () => {
  const { id: testId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (attemptId) {
      loadAttempt(attemptId);
    }
  }, [attemptId]);

  const loadAttempt = async (attId: string) => {
    setLoading(true);
    try {
      const { attempt: loadedAttempt, questions: loadedQuestions } = await testService.getAttemptById(attId);
      if (!loadedAttempt) {
        showToast('تقرير المحاولة غير موجود', 'error');
        return;
      }
      setAttempt(loadedAttempt);
      setQuestions(loadedQuestions);
    } catch (err) {
      showToast('خطأ في تحميل التقرير', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-slate-500 font-semibold">جاري تحميل تقرير الطالب التفصيلي...</p>
      </div>
    );
  }

  if (!attempt) return null;

  // Calculate elapsed time in minutes
  const startTime = new Date(attempt.started_at).getTime();
  const endTime = new Date(attempt.submitted_at).getTime();
  const durationMinutes = Math.max(Math.round((endTime - startTime) / 60000), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between no-print">
        <Link
          to={`/tests/${testId}/results`}
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-navy-900 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          <span>العودة لتقرير الاختبار العام</span>
        </Link>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4 text-gold-400" />
          <span>طباعة تقرير الطالب</span>
        </button>
      </div>

      {/* Student Overview Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center font-bold">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-navy-900">{attempt.student_name}</h1>
              <p className="text-xs text-slate-500 font-semibold">الصف: {attempt.grade}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">النتيجة النهائية</span>
            <div className="text-3xl font-extrabold text-navy-900">{attempt.score} / {attempt.total_score}</div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-900 mt-1">
              النسبة المئوية: {attempt.percentage}% ({attempt.rating})
            </span>
          </div>
        </div>

        {/* Timings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 block mb-1">وقت بدء الاختبار:</span>
            <span className="text-navy-900 font-bold">{formatDateArabic(attempt.started_at)}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 block mb-1">وقت التسليم:</span>
            <span className="text-navy-900 font-bold">{formatDateArabic(attempt.submitted_at)}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 block mb-1">استغرق في الحل:</span>
            <span className="text-navy-900 font-bold">{durationMinutes} دقيقة</span>
          </div>
        </div>

      </div>

      {/* Answers Detailed Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-navy-900">تفاصيل إجابات الطالب للأسئلة</h2>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const studentAns = attempt.answers?.find((a) => a.question_id === q.id);
            const selectedVal = studentAns?.selected_answer || '';
            const isCorrect = studentAns?.is_correct || (selectedVal && selectedVal.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());

            // Helper format option label text
            let studentAnsText = selectedVal ? selectedVal : 'لم يتم الإجابة';
            let correctAnsText = q.correct_answer;

            if (q.question_type === 'multiple_choice' && q.options) {
              const sOpt = q.options.find((o) => o.option_key === selectedVal);
              if (sOpt) studentAnsText = `(${sOpt.option_key.toUpperCase()}) ${sOpt.option_text}`;

              const cOpt = q.options.find((o) => o.option_key === q.correct_answer);
              if (cOpt) correctAnsText = `(${cOpt.option_key.toUpperCase()}) ${cOpt.option_text}`;
            } else if (q.question_type === 'true_false') {
              if (selectedVal === 'true') studentAnsText = 'صح';
              if (selectedVal === 'false') studentAnsText = 'خطأ';
              if (q.correct_answer === 'true') correctAnsText = 'صح';
              if (q.correct_answer === 'false') correctAnsText = 'خطأ';
            }

            return (
              <div
                key={q.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isCorrect
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg text-white font-extrabold text-xs flex items-center justify-center ${
                      isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-navy-900 text-sm">{q.question_text}</h3>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isCorrect ? `إجابة صحيحة (+${q.points})` : `إجابة خاطئة (0 من ${q.points})`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold pt-2 border-t border-slate-200/60">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-slate-400 block">إجابة الطالب:</span>
                    <span className={`font-bold block ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {studentAnsText}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-slate-400 block">الإجابة الصحيحة المعتمَدة:</span>
                    <span className="font-bold text-emerald-700 block">
                      {correctAnsText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
