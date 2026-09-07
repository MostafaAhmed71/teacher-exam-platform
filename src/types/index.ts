export type TestStatus = 'draft' | 'published' | 'stopped';

export type QuestionType = 'multiple_choice' | 'true_false';

export interface QuestionOption {
  id: string;
  question_id?: string;
  option_text: string;
  option_key: 'a' | 'b' | 'c' | 'd' | string;
  sort_order: number;
}

export interface Question {
  id: string;
  test_id?: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  correct_answer: string; // 'a', 'b', 'c', 'd' or 'true', 'false'
  sort_order: number;
  options?: QuestionOption[];
  created_at?: string;
}

// Student version of question without correct_answer!
export interface StudentQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  sort_order: number;
  options?: QuestionOption[];
}

export interface Test {
  id: string;
  teacher_id?: string;
  title: string;
  subject: string;
  grade: string;
  description?: string;
  duration_minutes?: number | null; // null means untimed
  show_correct_answers: boolean;
  show_result: boolean;
  status: TestStatus;
  created_at?: string;
  updated_at?: string;
  questions_count?: number;
  attempts_count?: number;
  avg_score?: number;
}

export type EvaluationRating = 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'يحتاج إلى تحسين';

export interface Attempt {
  id: string;
  test_id: string;
  student_name: string;
  grade: string;
  started_at: string;
  submitted_at: string;
  score: number;
  total_score: number;
  percentage: number;
  rating?: EvaluationRating;
  status: 'in_progress' | 'completed';
  attempt_identifier: string;
  created_at?: string;
  answers?: Answer[];
}

export interface Answer {
  id?: string;
  attempt_id?: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  points_earned: number;
  question?: Question;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at?: string;
}

export interface SubmissionPayload {
  test_id: string;
  student_name: string;
  grade: string;
  identifier: string;
  answers: Record<string, string>; // questionId -> selected_answer
}

export interface SubmissionResult {
  attempt_id: string;
  score: number;
  total_score: number;
  percentage: number;
  rating: EvaluationRating;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  show_correct_answers: boolean;
  show_result: boolean;
  questions_review?: {
    question_id: string;
    question_text: string;
    question_type: QuestionType;
    selected_answer: string;
    correct_answer: string;
    is_correct: boolean;
    points: number;
    points_earned: number;
    options?: QuestionOption[];
  }[];
}

export interface TestStats {
  total_students: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number; // percentage >= 60%
  passed_count: number;
  needs_improvement_count: number;
  grade_distribution: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '61-80': number;
    '81-100': number;
  };
}

export interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  total_responses: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  success_rate: number;
}
