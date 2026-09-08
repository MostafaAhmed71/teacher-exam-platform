import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { testService } from '../services/testService';
import type { SubmissionResult } from '../types';
import { calculateRating } from '../utils/helpers';
import {
  Award,
  AlertCircle,
  Eye,
  FileCheck,
  CheckCircle2,
  XCircle,
  Star,
  Check,
  X,
  Layers
} from 'lucide-react';

export const StudentTestResult: React.FC = () => {
  const { attemptId } = useParams<{ testId: string; attemptId: string }>();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [showReview, setShowReview] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'incorrect'>('all');

  useEffect(() => {
    if (!attemptId) return;

    // Check stored result from session
    const stored = sessionStorage.getItem(`result_${attemptId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.questions_review && parsed.questions_review.length > 0) {
        setResult(parsed);
        if (parsed.percentage >= 80) {
          triggerConfetti();
        }
        setLoading(false);
        return;
      }
    }
    
    loadAttemptFromDB(attemptId);
  }, [attemptId]);

  const loadAttemptFromDB = async (attId: string) => {
    setLoading(true);
    try {
      const { attempt, questions } = await testService.getAttemptById(attId);
      if (attempt) {
        const { test: testData } = await testService.getTestById(attempt.test_id);

        const correctCount = attempt.score;
        const totalCount = attempt.total_score;
        const incorrectCount = totalCount - correctCount;

        const questionsReview = questions.map((q) => {
          const ans = attempt.answers?.find((a) => a.question_id === q.id);
          const sel = ans?.selected_answer || '';
          const isCorr = ans?.is_correct || (sel && sel.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());
          return {
            question_id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            selected_answer: sel,
            correct_answer: q.correct_answer,
            is_correct: Boolean(isCorr),
            points: q.points,
            points_earned: isCorr ? q.points : 0,
            options: q.options,
          };
        });

        const resObj: SubmissionResult = {
          attempt_id: attempt.id,
          score: attempt.score,
          total_score: attempt.total_score,
          percentage: attempt.percentage,
          rating: attempt.rating || calculateRating(attempt.percentage),
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unanswered_count: 0,
          show_correct_answers: testData ? testData.show_correct_answers : true,
          show_result: testData ? testData.show_result : true,
          questions_review: questionsReview,
        };

        setResult(resObj);
        if (resObj.percentage >= 80) {
          triggerConfetti();
        }
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if confetti fails
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-bold text-lg">جاري حساب النتيجة وإعداد التقرير...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-navy-900">تعذر العثور على النتيجة</h2>
          <p className="text-xs text-slate-500">تأكد من صحة الرابط أو التحدث للمعلم المشرف.</p>
        </div>
      </div>
    );
  }

  // Filter questions review
  const reviews = result.questions_review || [];
  const filteredReviews = reviews.filter((r) => {
    if (filterType === 'correct') return r.is_correct;
    if (filterType === 'incorrect') return !r.is_correct;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Main Result Hero Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
          
          <div className="w-20 h-20 rounded-3xl bg-navy-900 text-gold-400 flex items-center justify-center mx-auto shadow-lg">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>تم الانتهاء من الاختبار وتسليمه بنجاح</span>
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
              نتيجة الاختبار النهائي
            </h1>
          </div>

          {/* Rating & Score Hero Box */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 shadow-inner">
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">الدرجة النهائية</span>
              <div className="text-4xl sm:text-5xl font-extrabold text-navy-900 tracking-tight">
                {result.score} <span className="text-2xl text-slate-400 font-semibold">/ {result.total_score}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-gold-500 text-navy-950 font-extrabold text-sm shadow-sm">
                النسبة المئوية: {result.percentage}%
              </span>

              <span className={`px-4 py-1.5 rounded-full font-extrabold text-sm shadow-sm ${
                result.percentage >= 90
                  ? 'bg-emerald-600 text-white'
                  : result.percentage >= 80
                  ? 'bg-blue-600 text-white'
                  : result.percentage >= 70
                  ? 'bg-indigo-600 text-white'
                  : result.percentage >= 60
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                التقييم: {result.rating}
              </span>
            </div>

          </div>

          {/* Stats Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1 text-emerald-900">
              <span className="block text-emerald-600 font-semibold">الإجابات الصحيحة</span>
              <div className="text-2xl font-extrabold">{result.correct_count}</div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-1 text-rose-900">
              <span className="block text-rose-600 font-semibold">الإجابات الخاطئة</span>
              <div className="text-2xl font-extrabold">{result.incorrect_count}</div>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-1 text-slate-700">
              <span className="block text-slate-500 font-semibold">غير المجابة</span>
              <div className="text-2xl font-extrabold">{result.unanswered_count}</div>
            </div>
          </div>

          {/* Toggle Answer Review Section */}
          {reviews.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReview(!showReview)}
                className="w-full py-3.5 px-6 bg-navy-900 hover:bg-navy-800 text-white font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all text-sm"
              >
                <Eye className="w-4 h-4 text-gold-400" />
                <span>{showReview ? 'إخفاء مراجعة الإجابات' : 'عرض مراجعة الإجابات التفصيلية'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Detailed Answer Review Section */}
        {showReview && reviews.length > 0 && (
          <div className="space-y-6">
            
            {/* Section Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gold-500 text-navy-950 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-navy-900">مراجعة الإجابات بالتفصيل</h2>
                  <p className="text-xs text-slate-500 font-medium">راجع كل سؤال لمعرفة إجابتك مقارنة بالإجابة الصحيحة المعتمَدة</p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl transition-all ${
                    filterType === 'all' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({reviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('correct')}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl transition-all ${
                    filterType === 'correct' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  الصحيحة ({result.correct_count})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('incorrect')}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl transition-all ${
                    filterType === 'incorrect' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  الخاطئة ({result.incorrect_count})
                </button>
              </div>
            </div>

            {/* Questions Review List */}
            <div className="space-y-6">
              {filteredReviews.map((item) => {
                const questionIndex = reviews.findIndex((r) => r.question_id === item.question_id) + 1;

                return (
                  <div
                    key={item.question_id}
                    className={`bg-white rounded-3xl p-6 shadow-md border-2 transition-all space-y-5 relative overflow-hidden ${
                      item.is_correct
                        ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                        : 'border-rose-300 ring-2 ring-rose-500/10'
                    }`}
                  >
                    {/* Top Status Strip */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      
                      {/* Question Index Badge */}
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-2xl bg-navy-900 text-gold-400 font-extrabold text-sm flex items-center justify-center shadow-md">
                          {questionIndex}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase">السؤال {questionIndex}</span>
                      </div>

                      {/* Result Badge */}
                      <div className="flex items-center gap-2">
                        {item.is_correct ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>إجابة صحيحة (+{item.points} نقاط)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-sm">
                            <XCircle className="w-4 h-4" />
                            <span>إجابة خاطئة (0 من {item.points} نقاط)</span>
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Question Text */}
                    <h3 className="text-base sm:text-lg font-extrabold text-navy-900 leading-relaxed">
                      {item.question_text}
                    </h3>

                    {/* Multiple Choice Options Visual Review */}
                    {item.question_type === 'multiple_choice' && item.options && item.options.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <span className="text-xs font-bold text-slate-400 block">خيارات السؤال وتصحيحها:</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {item.options.map((opt) => {
                            const isStudentChoice = item.selected_answer === opt.option_key;
                            const isCorrectChoice = item.correct_answer === opt.option_key;

                            let optionCardStyle = 'bg-slate-50 text-slate-700 border-slate-200';
                            let badgeContent = null;

                            if (isStudentChoice && isCorrectChoice) {
                              // Student chose correct answer!
                              optionCardStyle = 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold';
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100 text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  إجابتك (صحيحة)
                                </span>
                              );
                            } else if (isStudentChoice && !isCorrectChoice) {
                              // Student chose wrong answer!
                              optionCardStyle = 'bg-rose-600 text-white border-rose-700 shadow-md font-bold';
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-900 text-rose-100 text-[11px]">
                                  <X className="w-3.5 h-3.5" />
                                  إجابتك المختارة (خاطئة)
                                </span>
                              );
                            } else if (isCorrectChoice) {
                              // Correct answer that student missed
                              optionCardStyle = 'bg-gold-50 text-navy-950 border-gold-400 ring-2 ring-gold-400/50 font-bold';
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500 text-navy-950 text-[11px]">
                                  <Star className="w-3.5 h-3.5 fill-navy-950 text-navy-950" />
                                  الإجابة الصحيحة المعتمَدة
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt.id}
                                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs transition-all ${optionCardStyle}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-6 h-6 rounded-lg text-[11px] font-extrabold uppercase flex items-center justify-center shrink-0 ${
                                    isStudentChoice || isCorrectChoice ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {opt.option_key}
                                  </span>
                                  <span>{opt.option_text}</span>
                                </div>

                                {badgeContent}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* True / False Visual Review */}
                    {item.question_type === 'true_false' && (
                      <div className="space-y-2.5 pt-2">
                        <span className="text-xs font-bold text-slate-400 block">تصحيح الإجابة:</span>

                        <div className="grid grid-cols-2 gap-4">
                          {['true', 'false'].map((tfVal) => {
                            const labelText = tfVal === 'true' ? 'صح' : 'خطأ';
                            const isStudentChoice = item.selected_answer === tfVal;
                            const isCorrectChoice = item.correct_answer === tfVal;

                            let optionCardStyle = 'bg-slate-50 text-slate-700 border-slate-200';
                            let badgeText = null;

                            if (isStudentChoice && isCorrectChoice) {
                              optionCardStyle = 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold';
                              badgeText = 'إجابتك (صحيحة) ✓';
                            } else if (isStudentChoice && !isCorrectChoice) {
                              optionCardStyle = 'bg-rose-600 text-white border-rose-700 shadow-md font-bold';
                              badgeText = 'إجابتك (خاطئة) ✗';
                            } else if (isCorrectChoice) {
                              optionCardStyle = 'bg-gold-50 text-navy-950 border-gold-400 ring-2 ring-gold-400/50 font-bold';
                              badgeText = 'الإجابة الصحيحة المعتمَدة ★';
                            }

                            return (
                              <div
                                key={tfVal}
                                className={`p-4 rounded-2xl border-2 text-center text-sm transition-all space-y-1 ${optionCardStyle}`}
                              >
                                <div className="font-extrabold text-base">{labelText}</div>
                                {badgeText && (
                                  <span className="block text-[11px] font-bold opacity-90">{badgeText}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
