import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testService } from '../services/testService';
import type { Test, Question, QuestionType, TestStatus } from '../types';
import { generateUniqueTestId, copyToClipboard, getAppBaseUrl } from '../utils/helpers';
import { useToast } from '../components/Toast';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Save,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  Settings
} from 'lucide-react';

export const TestCreateEdit: React.FC = () => {
  const { id: editTestId } = useParams<{ id: string }>();
  const isEdit = Boolean(editTestId);

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Test Details Form State
  const [testId] = useState<string>(editTestId || generateUniqueTestId());
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [hasTimer, setHasTimer] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [defaultPoints, setDefaultPoints] = useState<number>(1);
  const [showResult, setShowResult] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [status, setStatus] = useState<TestStatus>('published');

  // Questions List State
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-' + Date.now(),
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      correct_answer: 'a',
      sort_order: 1,
      options: [
        { id: 'opt-1', option_text: '', option_key: 'a', sort_order: 1 },
        { id: 'opt-2', option_text: '', option_key: 'b', sort_order: 2 },
        { id: 'opt-3', option_text: '', option_key: 'c', sort_order: 3 },
        { id: 'opt-4', option_text: '', option_key: 'd', sort_order: 4 },
      ],
    },
  ]);

  useEffect(() => {
    if (isEdit && editTestId) {
      loadExistingTest(editTestId);
    }
  }, [editTestId]);

  const loadExistingTest = async (tId: string) => {
    setLoading(true);
    try {
      const { test, questions: loadedQuestions } = await testService.getTestById(tId);
      if (!test) {
        showToast('الاختبار غير موجود', 'error');
        navigate('/dashboard');
        return;
      }

      setTitle(test.title);
      setSubject(test.subject);
      setGrade(test.grade);
      setDescription(test.description || '');
      if (test.duration_minutes !== null && test.duration_minutes !== undefined) {
        setHasTimer(true);
        setDurationMinutes(test.duration_minutes);
      } else {
        setHasTimer(false);
      }
      setShowResult(test.show_result);
      setShowCorrectAnswers(test.show_correct_answers);
      setStatus(test.status);

      if (loadedQuestions && loadedQuestions.length > 0) {
        setQuestions(loadedQuestions);
      }
    } catch (err) {
      showToast('خطأ أثناء تحميل بيانات الاختبار', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add Question
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: 'q-' + Date.now() + Math.random(),
      question_text: '',
      question_type: 'multiple_choice',
      points: defaultPoints,
      correct_answer: 'a',
      sort_order: questions.length + 1,
      options: [
        { id: 'opt-1-' + Date.now(), option_text: '', option_key: 'a', sort_order: 1 },
        { id: 'opt-2-' + Date.now(), option_text: '', option_key: 'b', sort_order: 2 },
        { id: 'opt-3-' + Date.now(), option_text: '', option_key: 'c', sort_order: 3 },
        { id: 'opt-4-' + Date.now(), option_text: '', option_key: 'd', sort_order: 4 },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (index: number) => {
    const qToDup = questions[index];
    const duplicated: Question = {
      ...qToDup,
      id: 'q-' + Date.now() + Math.random(),
      sort_order: questions.length + 1,
      options: qToDup.options ? qToDup.options.map((opt) => ({ ...opt, id: 'opt-' + Math.random() })) : undefined,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    setQuestions(updated);
    showToast('تم نسخ السؤال بنجاح', 'info');
  };

  // Remove Question
  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      showToast('يجب أن يحتوي الاختبار على سؤال واحد على الأقل', 'error');
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  // Move Question Position
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setQuestions(updated);
  };

  // Update Question Field
  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    // If switching question_type to true_false, reset correct answer default
    if (field === 'question_type') {
      if (value === 'true_false') {
        updated[index].correct_answer = 'true';
      } else {
        updated[index].correct_answer = 'a';
        if (!updated[index].options || updated[index].options?.length === 0) {
          updated[index].options = [
            { id: 'opt-1', option_text: '', option_key: 'a', sort_order: 1 },
            { id: 'opt-2', option_text: '', option_key: 'b', sort_order: 2 },
            { id: 'opt-3', option_text: '', option_key: 'c', sort_order: 3 },
            { id: 'opt-4', option_text: '', option_key: 'd', sort_order: 4 },
          ];
        }
      }
    }
    setQuestions(updated);
  };

  // Update Option Text
  const handleUpdateOptionText = (qIndex: number, optKey: string, text: string) => {
    const updated = [...questions];
    const opts = updated[qIndex].options || [];
    const optIndex = opts.findIndex((o) => o.option_key === optKey);
    if (optIndex !== -1) {
      opts[optIndex].option_text = text;
      updated[qIndex].options = opts;
      setQuestions(updated);
    }
  };

  // Save Test Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !subject.trim() || !grade.trim()) {
      showToast('يرجى مِلء البيانات الأساسية للاختبار (العنوان، المادة، الصف)', 'error');
      return;
    }

    // Validate Questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        showToast(`يرجى كتابة نص السؤال رقم ${i + 1}`, 'error');
        return;
      }
      if (q.question_type === 'multiple_choice') {
        const hasEmptyOption = q.options?.some((opt) => !opt.option_text.trim());
        if (hasEmptyOption) {
          showToast(`يرجى إدخال جميع خيارات الإجابة للسؤال رقم ${i + 1}`, 'error');
          return;
        }
      }
    }

    setSaving(true);

    const testObject: Test = {
      id: testId,
      teacher_id: user?.id,
      title: title.trim(),
      subject: subject.trim(),
      grade: grade.trim(),
      description: description.trim(),
      duration_minutes: hasTimer ? durationMinutes : null,
      show_result: showResult,
      show_correct_answers: showCorrectAnswers,
      status,
    };

    try {
      if (isEdit) {
        await testService.updateTest(testId, testObject, questions);
        showToast('تم تحديث الاختبار والأسئلة بنجاح', 'success');
      } else {
        await testService.createTest(testObject, questions);
        showToast('تم إنشاء ونشر الاختبار بنجاح!', 'success');
      }
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الاختبار', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `${getAppBaseUrl()}/test/${testId}`;
    const ok = await copyToClipboard(link);
    if (ok) showToast('تم نسخ رابط الاختبار', 'success');
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-slate-500 font-semibold">جاري تحميل بيانات الاختبار...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-navy-900 text-xs font-bold mb-2">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-navy-900">
            {isEdit ? 'تعديل الاختبار والأسئلة' : 'إنشاء اختبار إلكتروني جديد'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            أدخل معلومات الاختبار وأضف الأسئلة ثم احفظ لنشر الرابط للطلاب.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ رابط الاختبار</span>
          </button>
          
          <a
            href={`${getAppBaseUrl()}/test/${testId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>فتح الاختبار</span>
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Step 1: Basic Test Information */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">البيانات الأساسية للاختبار</h2>
              <p className="text-xs text-slate-500">حدد العنوان، المادة، الصف، ومدة الاختبار</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Title */}
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم الاختبار *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار العلوم - الفصل الدراسي الأول"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المادة *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: العلوم / الرياضيات"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">الصف / المرحلة *</label>
              <input
                type="text"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="مثال: ثاني متوسط / خامس ابتدائي"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

            {/* Default Points */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">درجة كل سؤال (افتراضي)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={defaultPoints}
                onChange={(e) => setDefaultPoints(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-1">وصف الاختبار (اختياري)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أضف تعليمات وتوجيهات للطلاب قبل حل الاختبار..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

          </div>

          {/* Settings Grid */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Timer Config */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gold-600" />
                  <span className="font-bold text-navy-900 text-sm">مؤقت الاختبار التنازلي</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTimer}
                    onChange={(e) => setHasTimer(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                </label>
              </div>

              {hasTimer && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-semibold text-slate-600">مدة الاختبار:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center"
                  />
                  <span className="text-xs font-semibold text-slate-600">دقيقة</span>
                </div>
              )}
            </div>

            {/* Test Visibility & Options */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-bold text-navy-900 text-sm block">خيارات العرض بعد التسليم</span>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showResult}
                    onChange={(e) => setShowResult(e.target.checked)}
                    className="w-4 h-4 text-navy-900 rounded border-slate-300 focus:ring-navy-900"
                  />
                  <span>إظهار الدرجة والنسبة المئوية والتقييم للطالب فور الانتهاء</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 text-navy-900 rounded border-slate-300 focus:ring-navy-900"
                  />
                  <span>إظهار الإجابات الصحيحة والخاطئة للطالب لمراجعتها</span>
                </label>
              </div>
            </div>

            {/* Status Select */}
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="font-bold text-navy-900 text-sm block">حالة نشر الاختبار</span>
                <span className="text-xs text-slate-500">اختر حالة الاختبار في المنصة</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'published'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  منشور
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'draft'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  مسودة
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('stopped')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'stopped'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  متوقف
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Step 2: Questions Builder Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gold-500 text-navy-950 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-navy-900">أسئلة الاختبار ({questions.length})</h2>
                <p className="text-xs text-slate-500">أضف عدد غير محدود من الأسئلة وحدد الإجابات الصحيحة</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full sm:w-auto px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          {/* Question Cards List */}
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={q.id || index}
                className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5 relative transition-all"
              >
                {/* Question Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-navy-900 text-gold-400 font-extrabold text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-bold text-navy-900 text-sm">السؤال {index + 1}</span>
                  </div>

                  {/* Question Tools */}
                  <div className="flex items-center gap-1">
                    
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveQuestion(index, 'up')}
                      title="تحريك للأعلى"
                      className="p-1.5 text-slate-400 hover:text-navy-900 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === questions.length - 1}
                      onClick={() => handleMoveQuestion(index, 'down')}
                      title="تحريك للأسفل"
                      className="p-1.5 text-slate-400 hover:text-navy-900 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateQuestion(index)}
                      title="نسخ السؤال"
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(index)}
                      title="حذف السؤال"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </div>

                {/* Question Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* Question Text */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">نص السؤال *</label>
                    <input
                      type="text"
                      required
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestion(index, 'question_text', e.target.value)}
                      placeholder="اكتب نص السؤال هنا..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                    />
                  </div>

                  {/* Question Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">نوع السؤال</label>
                    <select
                      value={q.question_type}
                      onChange={(e) => handleUpdateQuestion(index, 'question_type', e.target.value as QuestionType)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-navy-900"
                    >
                      <option value="multiple_choice">اختيار من متعدد</option>
                      <option value="true_false">صح أو خطأ</option>
                    </select>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">الدرجة المستحقة</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={q.points}
                      onChange={(e) => handleUpdateQuestion(index, 'points', Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-navy-900"
                    />
                  </div>

                </div>

                {/* Multiple Choice Options Builder */}
                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-600">خيارات الإجابة وتحديد الإجابة الصحيحة:</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(q.options || []).map((opt) => (
                        <div
                          key={opt.option_key}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                            q.correct_answer === opt.option_key
                              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${index}`}
                            checked={q.correct_answer === opt.option_key}
                            onChange={() => handleUpdateQuestion(index, 'correct_answer', opt.option_key)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 shrink-0"
                          />
                          <span className="font-bold text-xs text-slate-500 uppercase shrink-0">
                            {opt.option_key})
                          </span>
                          <input
                            type="text"
                            required
                            value={opt.option_text}
                            onChange={(e) => handleUpdateOptionText(index, opt.option_key, e.target.value)}
                            placeholder={`الخيار (${opt.option_key})`}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-navy-900"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>الإجابة الصحيحة المحددة: <strong>الخيار ({q.correct_answer.toUpperCase()})</strong></span>
                    </div>
                  </div>
                )}

                {/* True / False Builder */}
                {q.question_type === 'true_false' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-600">حدد الإجابة الصحيحة:</label>
                    
                    <div className="flex items-center gap-4">
                      <label
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition-all ${
                          q.correct_answer === 'true'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`tf_${index}`}
                          checked={q.correct_answer === 'true'}
                          onChange={() => handleUpdateQuestion(index, 'correct_answer', 'true')}
                          className="sr-only"
                        />
                        <span>صح</span>
                      </label>

                      <label
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-sm transition-all ${
                          q.correct_answer === 'false'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`tf_${index}`}
                          checked={q.correct_answer === 'false'}
                          onChange={() => handleUpdateQuestion(index, 'correct_answer', 'false')}
                          className="sr-only"
                        />
                        <span>خطأ</span>
                      </label>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Add Question Button Footer */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 text-navy-900 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Plus className="w-5 h-5 text-gold-600" />
            <span>+ إضافة سؤال جديد للاختبار</span>
          </button>
        </div>

        {/* Floating Submit Bar */}
        <div className="bg-navy-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-navy-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sticky bottom-2 sm:bottom-4 z-30 mx-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-navy-950 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm block">جاهز للنشر والمعالجة</span>
              <span className="text-xs text-slate-300 break-words">إجمالي الأسئلة: {questions.length} سؤال | الدرجة الكلية: {questions.reduce((a, b) => a + (b.points || 1), 0)} درجة</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 sm:flex-none px-6 py-3 bg-navy-800 hover:bg-navy-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'حفظ التعديلات' : 'إنشاء ونشر الاختبار الآن'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
