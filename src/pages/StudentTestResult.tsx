import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { testService } from '../services/testService';
import type { SubmissionResult } from '../types';
import { calculateRating } from '../utils/helpers';
import { Award, AlertCircle, Eye, FileCheck } from 'lucide-react';

export const StudentTestResult: React.FC = () => {
  const { attemptId } = useParams<{ testId: string; attemptId: string }>();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [showReview, setShowReview] = useState(true);

  useEffect(() => {
    if (!attemptId) return;

    // Check stored result from session
    const stored = sessionStorage.getItem(`result_${attemptId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setResult(parsed);
      if (parsed.percentage >= 80) {
        triggerConfetti();
      }
      setLoading(false);
    } else if (attemptId) {
      loadAttemptFromDB(attemptId);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Main Result Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
          
          <div className="w-20 h-20 rounded-3xl bg-navy-900 text-gold-400 flex items-center justify-center mx-auto shadow-lg">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <FileCheck className="w-4 h-4" />
              <span>تم الانتهاء من الاختبار وتسليمه بنجاح</span>
            </span>

            <h1 className="text-2xl font-extrabold text-navy-900">نتيجة الاختبار النهائي</h1>
          </div>

          {/* Rating & Score Hero Box */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">الدرجة النهائية</span>
              <div className="text-4xl sm:text-5xl font-extrabold text-navy-900 tracking-tight">
                {result.score} <span className="text-2xl text-slate-400 font-semibold">/ {result.total_score}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
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
          <div className="grid grid-cols-3 gap-3 text-xs font-bold">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1 text-emerald-900">
              <span className="block text-emerald-600 font-semibold">الإجابات الصحيحة</span>
              <div className="text-xl font-extrabold">{result.correct_count}</div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-1 text-rose-900">
              <span className="block text-rose-600 font-semibold">الإجابات الخاطئة</span>
              <div className="text-xl font-extrabold">{result.incorrect_count}</div>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-1 text-slate-700">
              <span className="block text-slate-500 font-semibold">غير المجابة</span>
              <div className="text-xl font-extrabold">{result.unanswered_count}</div>
            </div>
          </div>

          {/* Review Answers Button */}
          {result.show_correct_answers && result.questions_review && (
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReview(!showReview)}
                className="w-full py-3.5 px-6 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Eye className="w-4 h-4 text-gold-400" />
                <span>{showReview ? 'إخفاء مراجعة الإجابات' : 'مراجعة الإجابات التفصيلية'}</span>
              </button>
            </div>
          )}

        </div>

        {/* Answer Review Section */}
        {showReview && result.show_correct_answers && result.questions_review && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-navy-900 text-center">مراجعة إجاباتك بالتفصيل</h2>

            <div className="space-y-4">
              {result.questions_review.map((item, idx) => {
                let studentAnsText = item.selected_answer || 'لم تجب على السؤال';
                let correctAnsText = item.correct_answer;

                if (item.question_type === 'multiple_choice' && item.options) {
                  const sOpt = item.options.find((o) => o.option_key === item.selected_answer);
                  if (sOpt) studentAnsText = `(${sOpt.option_key.toUpperCase()}) ${sOpt.option_text}`;

                  const cOpt = item.options.find((o) => o.option_key === item.correct_answer);
                  if (cOpt) correctAnsText = `(${cOpt.option_key.toUpperCase()}) ${cOpt.option_text}`;
                } else if (item.question_type === 'true_false') {
                  if (item.selected_answer === 'true') studentAnsText = 'صح';
                  if (item.selected_answer === 'false') studentAnsText = 'خطأ';
                  if (item.correct_answer === 'true') correctAnsText = 'صح';
                  if (item.correct_answer === 'false') correctAnsText = 'خطأ';
                }

                return (
                  <div
                    key={item.question_id}
                    className={`bg-white p-6 rounded-3xl shadow-sm border transition-all ${
                      item.is_correct ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg text-white font-extrabold text-xs flex items-center justify-center ${
                          item.is_correct ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-navy-900 text-sm">{item.question_text}</h3>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        item.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.is_correct ? 'إجابة صحيحة ✓' : 'إجابة خاطئة ✗'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold pt-2 border-t border-slate-100">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <span className="text-slate-400 block">إجابتك:</span>
                        <span className={`font-bold block ${item.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {studentAnsText}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                        <span className="text-slate-400 block">الإجابة الصحيحة:</span>
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
        )}

      </div>
    </div>
  );
};
