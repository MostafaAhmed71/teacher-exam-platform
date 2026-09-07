import type { Test, Question, Attempt } from '../types';

export const initialMockTests: Test[] = [
  {
    id: 'Ab7K92xP',
    teacher_id: 'teacher-demo-id',
    title: 'اختبار العلوم - الوحدة الأولى: الكواكب والنجوم',
    subject: 'العلوم',
    grade: 'ثاني متوسط',
    description: 'اختبار تقويمي يقيس مدى استيعاب الطلاب لمفاهيم النظام الشمسي والمجرات والفرق بين الكوكب والنجم.',
    duration_minutes: 15,
    show_correct_answers: true,
    show_result: true,
    status: 'published',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    questions_count: 5,
    attempts_count: 12,
    avg_score: 84,
  },
  {
    id: 'X9k2P7mN',
    teacher_id: 'teacher-demo-id',
    title: 'اختبار الرياضيات - النسبة والتناسب',
    subject: 'الرياضيات',
    grade: 'ثالث متوسط',
    description: 'اختبار شامل في تطبيقات النسبة المئوية والتناسب الطردي والعكسي.',
    duration_minutes: 20,
    show_correct_answers: true,
    show_result: true,
    status: 'published',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    questions_count: 4,
    attempts_count: 8,
    avg_score: 78,
  },
  {
    id: 'L3m8Q1wR',
    teacher_id: 'teacher-demo-id',
    title: 'اختبار اللغة العربية - النحو والصرف',
    subject: 'اللغة العربية',
    grade: 'أول ثانوي',
    description: 'اختبار مراجعة في قواعد الإعراب والفاعل والمفعول به والأفعال الخمسة.',
    duration_minutes: null, // Untimed
    show_correct_answers: false,
    show_result: true,
    status: 'draft',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    questions_count: 3,
    attempts_count: 0,
    avg_score: 0,
  }
];

export const initialMockQuestions: Record<string, Question[]> = {
  'Ab7K92xP': [
    {
      id: 'q1-1',
      test_id: 'Ab7K92xP',
      question_text: 'ما هو أقرب كوكب إلى الشمس في مجموعتنا الشمسية؟',
      question_type: 'multiple_choice',
      points: 2,
      correct_answer: 'b',
      sort_order: 1,
      options: [
        { id: 'opt1-1', option_text: 'الزهرة', option_key: 'a', sort_order: 1 },
        { id: 'opt1-2', option_text: 'عطارد', option_key: 'b', sort_order: 2 },
        { id: 'opt1-3', option_text: 'المريخ', option_key: 'c', sort_order: 3 },
        { id: 'opt1-4', option_text: 'الأرض', option_key: 'd', sort_order: 4 },
      ]
    },
    {
      id: 'q1-2',
      test_id: 'Ab7K92xP',
      question_text: 'الشمس تعتبر نجماً وليست كوكباً.',
      question_type: 'true_false',
      points: 2,
      correct_answer: 'true',
      sort_order: 2,
    },
    {
      id: 'q1-3',
      test_id: 'Ab7K92xP',
      question_text: 'ما هو أضخم كوكب في النظام الشمسي؟',
      question_type: 'multiple_choice',
      points: 2,
      correct_answer: 'c',
      sort_order: 3,
      options: [
        { id: 'opt3-1', option_text: 'زحل', option_key: 'a', sort_order: 1 },
        { id: 'opt3-2', option_text: 'أورانوس', option_key: 'b', sort_order: 2 },
        { id: 'opt3-3', option_text: 'المشتري', option_key: 'c', sort_order: 3 },
        { id: 'opt3-4', option_text: 'نبتون', option_key: 'd', sort_order: 4 },
      ]
    },
    {
      id: 'q1-4',
      test_id: 'Ab7K92xP',
      question_text: 'يدور القمر حول الأرض في مدة تقارب 27.3 يوماً.',
      question_type: 'true_false',
      points: 2,
      correct_answer: 'true',
      sort_order: 4,
    },
    {
      id: 'q1-5',
      test_id: 'Ab7K92xP',
      question_text: 'أي من الكواكب التالية يلقب بالحمر أو الكوكب الأحمر؟',
      question_type: 'multiple_choice',
      points: 2,
      correct_answer: 'a',
      sort_order: 5,
      options: [
        { id: 'opt5-1', option_text: 'المريخ', option_key: 'a', sort_order: 1 },
        { id: 'opt5-2', option_text: 'عطارد', option_key: 'b', sort_order: 2 },
        { id: 'opt5-3', option_text: 'الزهرة', option_key: 'c', sort_order: 3 },
        { id: 'opt5-4', option_text: 'زحل', option_key: 'd', sort_order: 4 },
      ]
    }
  ]
};

export const initialMockAttempts: Attempt[] = [
  {
    id: 'att-1',
    test_id: 'Ab7K92xP',
    student_name: 'أحمد محمد العتيبي',
    grade: 'ثاني متوسط',
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    submitted_at: new Date(Date.now() - 2 * 3600000 + 480000).toISOString(),
    score: 10,
    total_score: 10,
    percentage: 100,
    rating: 'ممتاز',
    status: 'completed',
    attempt_identifier: 'demo_student_1',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'att-2',
    test_id: 'Ab7K92xP',
    student_name: 'سارة خالد الدوسري',
    grade: 'ثاني متوسط',
    started_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    submitted_at: new Date(Date.now() - 4 * 3600000 + 540000).toISOString(),
    score: 8,
    total_score: 10,
    percentage: 80,
    rating: 'جيد جداً',
    status: 'completed',
    attempt_identifier: 'demo_student_2',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'att-3',
    test_id: 'Ab7K92xP',
    student_name: 'عمر فهد القحطاني',
    grade: 'ثاني متوسط',
    started_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    submitted_at: new Date(Date.now() - 6 * 3600000 + 600000).toISOString(),
    score: 6,
    total_score: 10,
    percentage: 60,
    rating: 'مقبول',
    status: 'completed',
    attempt_identifier: 'demo_student_3',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  }
];
