import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Test, StudentQuestion, Question, SubmissionPayload, SubmissionResult, Attempt, Answer } from '../types';
import { initialMockTests, initialMockQuestions, initialMockAttempts } from './mockData';
import { calculateRating } from '../utils/helpers';

const ATTEMPTS_LOCAL_KEY = 'teacher_platform_attempts';

export const studentService = {
  /**
   * Fetch public test for student. Must NOT expose correct answers!
   */
  async getPublicTest(testId: string): Promise<{ test: Test | null; questions: StudentQuestion[]; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('get_public_test_details', { p_test_id: testId });

      if (error) {
        return { test: null, questions: [], error: 'حدث خطأ أثناء تحميل بيانات الاختبار' };
      }

      if (data?.error) {
        return { test: null, questions: [], error: data.error };
      }

      return {
        test: data.test,
        questions: data.questions || [],
      };
    }

    // Local Fallback Mode
    const testsStr = localStorage.getItem('teacher_platform_tests');
    const tests: Test[] = testsStr ? JSON.parse(testsStr) : initialMockTests;
    const test = tests.find((t) => t.id === testId) || null;

    if (!test) {
      return { test: null, questions: [], error: 'عذراً، هذا الاختبار غير موجود.' };
    }

    if (test.status !== 'published') {
      return { test: null, questions: [], error: 'هذا الاختبار غير متاح حالياً (غير منشور أو متوقف).' };
    }

    const questionsStr = localStorage.getItem('teacher_platform_questions');
    const questionsMap: Record<string, Question[]> = questionsStr ? JSON.parse(questionsStr) : initialMockQuestions;
    const fullQuestions = questionsMap[testId] || [];

    // Strip correct_answer for student view!
    const studentQuestions: StudentQuestion[] = fullQuestions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      sort_order: q.sort_order,
      options: q.options,
    }));

    return { test, questions: studentQuestions };
  },

  /**
   * Check if student has already completed this test
   */
  async checkExistingAttempt(testId: string, identifier: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('check_existing_attempt', {
        p_test_id: testId,
        p_identifier: identifier,
      });

      if (error) {
        console.error('Error checking existing attempt:', error);
        return false;
      }
      return Boolean(data);
    }

    // Local Fallback Mode
    const attemptsStr = localStorage.getItem(ATTEMPTS_LOCAL_KEY);
    const attempts: Attempt[] = attemptsStr ? JSON.parse(attemptsStr) : initialMockAttempts;
    return attempts.some((a) => a.test_id === testId && a.attempt_identifier === identifier && a.status === 'completed');
  },

  /**
   * Submit student answers for auto-grading
   */
  async submitAttempt(payload: SubmissionPayload): Promise<{ result: SubmissionResult | null; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('submit_test_attempt', {
        p_test_id: payload.test_id,
        p_student_name: payload.student_name,
        p_grade: payload.grade,
        p_identifier: payload.identifier,
        p_answers: payload.answers,
      });

      if (error) {
        return { result: null, error: error.message };
      }

      return { result: data };
    }

    // Local Fallback Mode
    const testsStr = localStorage.getItem('teacher_platform_tests');
    const tests: Test[] = testsStr ? JSON.parse(testsStr) : initialMockTests;
    const test = tests.find((t) => t.id === payload.test_id);

    if (!test || test.status !== 'published') {
      return { result: null, error: 'هذا الاختبار غير متاح حالياً للتسليم' };
    }

    // Check duplicate
    const attemptsStr = localStorage.getItem(ATTEMPTS_LOCAL_KEY);
    const attempts: Attempt[] = attemptsStr ? JSON.parse(attemptsStr) : initialMockAttempts;

    if (attempts.some((a) => a.test_id === payload.test_id && a.attempt_identifier === payload.identifier)) {
      return { result: null, error: 'لقد سبق لك أداء هذا الاختبار ولا يمكن إعادة المحاولة.' };
    }

    const questionsStr = localStorage.getItem('teacher_platform_questions');
    const questionsMap: Record<string, Question[]> = questionsStr ? JSON.parse(questionsStr) : initialMockQuestions;
    const questions = questionsMap[payload.test_id] || [];

    let score = 0;
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answersList: Answer[] = [];
    const questionsReview: SubmissionResult['questions_review'] = [];

    questions.forEach((q) => {
      totalScore += q.points;
      const selected = payload.answers[q.id] || '';

      const isCorrect = Boolean(selected && selected.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());
      const pointsEarned = isCorrect ? q.points : 0;

      if (!selected) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
        score += q.points;
      } else {
        incorrectCount++;
      }

      answersList.push({
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });

      questionsReview.push({
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        selected_answer: selected,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        points: q.points,
        points_earned: pointsEarned,
        options: q.options,
      });
    });

    const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
    const rating = calculateRating(percentage);
    const attemptId = 'att-' + Date.now();

    const newAttempt: Attempt = {
      id: attemptId,
      test_id: payload.test_id,
      student_name: payload.student_name,
      grade: payload.grade,
      started_at: new Date(Date.now() - 600000).toISOString(),
      submitted_at: new Date().toISOString(),
      score,
      total_score: totalScore,
      percentage,
      rating,
      status: 'completed',
      attempt_identifier: payload.identifier,
      answers: answersList,
    };

    attempts.unshift(newAttempt);
    localStorage.setItem(ATTEMPTS_LOCAL_KEY, JSON.stringify(attempts));

    return {
      result: {
        attempt_id: attemptId,
        score,
        total_score: totalScore,
        percentage,
        rating,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        show_correct_answers: test.show_correct_answers,
        show_result: test.show_result,
        questions_review: questionsReview,
      },
    };
  },

  /**
   * Save transient answers to local storage during test taking
   */
  saveDraftAnswers(testId: string, answers: Record<string, string>): void {
    localStorage.setItem(`exam_draft_${testId}`, JSON.stringify(answers));
  },

  /**
   * Load transient answers from local storage
   */
  loadDraftAnswers(testId: string): Record<string, string> {
    const data = localStorage.getItem(`exam_draft_${testId}`);
    return data ? JSON.parse(data) : {};
  },

  /**
   * Clear transient answers upon submission
   */
  clearDraftAnswers(testId: string): void {
    localStorage.removeItem(`exam_draft_${testId}`);
  }
};
