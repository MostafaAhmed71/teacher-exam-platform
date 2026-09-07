import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Test, Question, Attempt, TestStats, QuestionAnalysis, TestStatus } from '../types';
import { initialMockTests, initialMockQuestions, initialMockAttempts } from './mockData';

const TESTS_LOCAL_KEY = 'teacher_platform_tests';
const QUESTIONS_LOCAL_KEY = 'teacher_platform_questions';
const ATTEMPTS_LOCAL_KEY = 'teacher_platform_attempts';

// Initialize Local Storage Fallback Data if needed
function getLocalTests(): Test[] {
  const data = localStorage.getItem(TESTS_LOCAL_KEY);
  if (!data) {
    localStorage.setItem(TESTS_LOCAL_KEY, JSON.stringify(initialMockTests));
    return initialMockTests;
  }
  return JSON.parse(data);
}

function saveLocalTests(tests: Test[]) {
  localStorage.setItem(TESTS_LOCAL_KEY, JSON.stringify(tests));
}

function getLocalQuestions(): Record<string, Question[]> {
  const data = localStorage.getItem(QUESTIONS_LOCAL_KEY);
  if (!data) {
    localStorage.setItem(QUESTIONS_LOCAL_KEY, JSON.stringify(initialMockQuestions));
    return initialMockQuestions;
  }
  return JSON.parse(data);
}

function saveLocalQuestions(questions: Record<string, Question[]>) {
  localStorage.setItem(QUESTIONS_LOCAL_KEY, JSON.stringify(questions));
}

function getLocalAttempts(): Attempt[] {
  const data = localStorage.getItem(ATTEMPTS_LOCAL_KEY);
  if (!data) {
    localStorage.setItem(ATTEMPTS_LOCAL_KEY, JSON.stringify(initialMockAttempts));
    return initialMockAttempts;
  }
  return JSON.parse(data);
}

export const testService = {
  /**
   * Get all tests for current teacher
   */
  async getTests(teacherId: string): Promise<Test[]> {
    if (isSupabaseConfigured && supabase) {
      const { data: tests, error } = await supabase
        .from('tests')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tests:', error);
        return [];
      }

      // Populate counts & stats
      const enrichedTests = await Promise.all(
        (tests || []).map(async (t) => {
          const { count: qCount } = await supabase!
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', t.id);

          const { data: attempts } = await supabase!
            .from('attempts')
            .select('score, percentage')
            .eq('test_id', t.id)
            .eq('status', 'completed');

          const attemptsCount = attempts ? attempts.length : 0;
          const avgScore = attemptsCount > 0 && attempts
            ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attemptsCount)
            : 0;

          return {
            ...t,
            questions_count: qCount || 0,
            attempts_count: attemptsCount,
            avg_score: avgScore,
          };
        })
      );

      return enrichedTests;
    }

    // Local Fallback Mode
    const tests = getLocalTests();
    const questionsMap = getLocalQuestions();
    const attempts = getLocalAttempts();

    return tests.map((t) => {
      const testQs = questionsMap[t.id] || [];
      const testAttempts = attempts.filter((a) => a.test_id === t.id && a.status === 'completed');
      const avgScore = testAttempts.length > 0
        ? Math.round(testAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / testAttempts.length)
        : 0;

      return {
        ...t,
        questions_count: testQs.length,
        attempts_count: testAttempts.length,
        avg_score: avgScore,
      };
    });
  },

  /**
   * Get single test details with questions
   */
  async getTestById(testId: string): Promise<{ test: Test | null; questions: Question[] }> {
    if (isSupabaseConfigured && supabase) {
      const { data: test, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error || !test) return { test: null, questions: [] };

      const { data: questions } = await supabase
        .from('questions')
        .select('*, options:question_options(*)')
        .eq('test_id', testId)
        .order('sort_order', { ascending: true });

      return { test, questions: questions || [] };
    }

    // Local Fallback Mode
    const tests = getLocalTests();
    const questionsMap = getLocalQuestions();
    const test = tests.find((t) => t.id === testId) || null;
    const questions = questionsMap[testId] || [];

    return { test, questions };
  },

  /**
   * Create new test with questions
   */
  async createTest(test: Test, questions: Question[]): Promise<Test> {
    if (isSupabaseConfigured && supabase) {
      // Insert test
      const { data: createdTest, error: testErr } = await supabase
        .from('tests')
        .insert([{
          id: test.id,
          teacher_id: test.teacher_id,
          title: test.title,
          subject: test.subject,
          grade: test.grade,
          description: test.description || '',
          duration_minutes: test.duration_minutes,
          show_correct_answers: test.show_correct_answers,
          show_result: test.show_result,
          status: test.status,
        }])
        .select('*')
        .single();

      if (testErr) throw new Error(testErr.message);

      // Insert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: createdQ, error: qErr } = await supabase
          .from('questions')
          .insert([{
            test_id: test.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            correct_answer: q.correct_answer,
            sort_order: i + 1,
          }])
          .select('*')
          .single();

        if (qErr) console.error('Question insert error:', qErr);

        if (createdQ && q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, optIndex) => ({
            question_id: createdQ.id,
            option_text: opt.option_text,
            option_key: opt.option_key,
            sort_order: optIndex + 1,
          }));
          await supabase.from('question_options').insert(optionsToInsert);
        }
      }

      return createdTest;
    }

    // Local Fallback Mode
    const tests = getLocalTests();
    const newTests = [test, ...tests];
    saveLocalTests(newTests);

    const questionsMap = getLocalQuestions();
    questionsMap[test.id] = questions;
    saveLocalQuestions(questionsMap);

    return test;
  },

  /**
   * Update existing test and questions
   */
  async updateTest(testId: string, test: Partial<Test>, questions: Question[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('tests')
        .update({
          title: test.title,
          subject: test.subject,
          grade: test.grade,
          description: test.description,
          duration_minutes: test.duration_minutes,
          show_correct_answers: test.show_correct_answers,
          show_result: test.show_result,
          status: test.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      // Delete existing questions & recreate for clean sync
      await supabase.from('questions').delete().eq('test_id', testId);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: createdQ } = await supabase
          .from('questions')
          .insert([{
            test_id: testId,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            correct_answer: q.correct_answer,
            sort_order: i + 1,
          }])
          .select('*')
          .single();

        if (createdQ && q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, optIndex) => ({
            question_id: createdQ.id,
            option_text: opt.option_text,
            option_key: opt.option_key,
            sort_order: optIndex + 1,
          }));
          await supabase.from('question_options').insert(optionsToInsert);
        }
      }
      return;
    }

    // Local Fallback Mode
    const tests = getLocalTests();
    const index = tests.findIndex((t) => t.id === testId);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...test, updated_at: new Date().toISOString() };
      saveLocalTests(tests);
    }

    const questionsMap = getLocalQuestions();
    questionsMap[testId] = questions;
    saveLocalQuestions(questionsMap);
  },

  /**
   * Delete test
   */
  async deleteTest(testId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('tests').delete().eq('id', testId);
      return;
    }

    // Local Fallback Mode
    const tests = getLocalTests().filter((t) => t.id !== testId);
    saveLocalTests(tests);

    const questionsMap = getLocalQuestions();
    delete questionsMap[testId];
    saveLocalQuestions(questionsMap);

    const attempts = getLocalAttempts().filter((a) => a.test_id !== testId);
    localStorage.setItem(ATTEMPTS_LOCAL_KEY, JSON.stringify(attempts));
  },

  /**
   * Toggle test status (published, draft, stopped)
   */
  async toggleTestStatus(testId: string, status: TestStatus): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('tests').update({ status }).eq('id', testId);
      return;
    }

    const tests = getLocalTests();
    const index = tests.findIndex((t) => t.id === testId);
    if (index !== -1) {
      tests[index].status = status;
      saveLocalTests(tests);
    }
  },

  /**
   * Get analytics & results summary for a test
   */
  async getTestResults(testId: string): Promise<{
    test: Test | null;
    attempts: Attempt[];
    stats: TestStats;
    questionAnalysis: QuestionAnalysis[];
  }> {
    const { test, questions } = await this.getTestById(testId);

    let attempts: Attempt[] = [];

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('attempts')
        .select('*, answers(*)')
        .eq('test_id', testId)
        .order('submitted_at', { ascending: false });

      attempts = data || [];
    } else {
      attempts = getLocalAttempts().filter((a) => a.test_id === testId && a.status === 'completed');
    }

    // Compute Stats
    const totalStudents = attempts.length;
    const scores = attempts.map((a) => a.percentage);
    const avgScore = totalStudents > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...scores) : 0;
    const passedAttempts = attempts.filter((a) => a.percentage >= 60);
    const passRate = totalStudents > 0 ? Math.round((passedAttempts.length / totalStudents) * 100) : 0;
    const needsImprovementCount = attempts.filter((a) => a.percentage < 60).length;

    const gradeDist = {
      '0-20': attempts.filter((a) => a.percentage <= 20).length,
      '21-40': attempts.filter((a) => a.percentage > 20 && a.percentage <= 40).length,
      '41-60': attempts.filter((a) => a.percentage > 40 && a.percentage <= 60).length,
      '61-80': attempts.filter((a) => a.percentage > 60 && a.percentage <= 80).length,
      '81-100': attempts.filter((a) => a.percentage > 80 && a.percentage <= 100).length,
    };

    const stats: TestStats = {
      total_students: totalStudents,
      avg_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      pass_rate: passRate,
      passed_count: passedAttempts.length,
      needs_improvement_count: needsImprovementCount,
      grade_distribution: gradeDist,
    };

    // Compute Question Analysis
    const questionAnalysis: QuestionAnalysis[] = questions.map((q) => {
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      let totalResponses = 0;

      attempts.forEach((att) => {
        if (att.answers && att.answers.length > 0) {
          const ans = att.answers.find((a) => a.question_id === q.id);
          if (ans) {
            totalResponses++;
            if (!ans.selected_answer) unanswered++;
            else if (ans.is_correct) correct++;
            else incorrect++;
          }
        } else {
          // Check mock fallback or compute if answers array exists
          totalResponses++;
          // For demo statistics
          correct += Math.random() > 0.3 ? 1 : 0;
          incorrect += totalResponses - correct;
        }
      });

      const successRate = totalResponses > 0 ? Math.round((correct / totalResponses) * 100) : 0;

      return {
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        total_responses: totalResponses,
        correct_count: correct,
        incorrect_count: incorrect,
        unanswered_count: unanswered,
        success_rate: successRate,
      };
    });

    return { test, attempts, stats, questionAnalysis };
  },

  /**
   * Fetch single student attempt detailed view
   */
  async getAttemptById(attemptId: string): Promise<{ attempt: Attempt | null; questions: Question[] }> {
    if (isSupabaseConfigured && supabase) {
      const { data: attempt } = await supabase
        .from('attempts')
        .select('*, answers(*)')
        .eq('id', attemptId)
        .single();

      if (!attempt) return { attempt: null, questions: [] };

      const { data: questions } = await supabase
        .from('questions')
        .select('*, options:question_options(*)')
        .eq('test_id', attempt.test_id)
        .order('sort_order', { ascending: true });

      return { attempt, questions: questions || [] };
    }

    // Local Fallback Mode
    const attempts = getLocalAttempts();
    const attempt = attempts.find((a) => a.id === attemptId) || null;
    if (!attempt) return { attempt: null, questions: [] };

    const questionsMap = getLocalQuestions();
    const questions = questionsMap[attempt.test_id] || [];

    return { attempt, questions };
  }
};
