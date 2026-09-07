import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { testService } from '../services/testService';
import type { Test, Attempt, TestStats, QuestionAnalysis } from '../types';
import { formatDateArabic } from '../utils/helpers';
import { useToast } from '../components/Toast';
import {
  Search,
  ArrowLeft,
  ChevronLeft,
  BarChart2
} from 'lucide-react';

export const TestResults: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<TestStats | null>(null);
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([]);

  // Search & Filters
  const [searchName, setSearchName] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'score_desc' | 'score_asc'>('date_desc');
  const [activeTab, setActiveTab] = useState<'students' | 'questions'>('students');

  useEffect(() => {
    if (testId) {
      loadData(testId);
    }
  }, [testId]);

  const loadData = async (tId: string) => {
    setLoading(true);
    try {
      const data = await testService.getTestResults(tId);
      if (!data.test) {
        showToast('الاختبار غير موجود', 'error');
        navigate('/dashboard');
        return;
      }
      setTest(data.test);
      setAttempts(data.attempts);
      setStats(data.stats);
      setQuestionAnalysis(data.questionAnalysis);
    } catch (err) {
      showToast('خطأ أثناء تحميل تقارير الاختبار', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-slate-500 font-semibold">جاري تحميل تقارير وإحصائيات الاختبار...</p>
      </div>
    );
  }

  if (!test || !stats) return null;

  // Grades list for filter
  const gradesList = Array.from(new Set(attempts.map((a) => a.grade)));

  // Filtered & Sorted Attempts
  const filteredAttempts = attempts
    .filter((a) => {
      const matchesSearch = a.student_name.toLowerCase().includes(searchName.toLowerCase());
      const matchesGrade = gradeFilter === 'all' || a.grade === gradeFilter;
      return matchesSearch && matchesGrade;
    })
    .sort((a, b) => {
      if (sortBy === 'score_desc') return b.percentage - a.percentage;
      if (sortBy === 'score_asc') return a.percentage - b.percentage;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-navy-900 text-xs font-bold mb-2">
            <ArrowLeft className="w-4 h-4 rotate-180" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-navy-900">{test.title}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            المادة: {test.subject} | الصف: {test.grade} | تاريخ الإنشاء: {formatDateArabic(test.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/tests/${test.id}/edit`}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            تعديل الاختبار
          </Link>

          <a
            href={`${window.location.origin}/test/${test.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl text-xs shadow-md transition-colors"
          >
            صفحة تقديم الطالب
          </a>
        </div>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">إجمالي الطلاب</span>
          <div className="text-2xl font-extrabold text-navy-900">{stats.total_students}</div>
          <span className="text-[11px] text-slate-500">طالب خاض الاختبار</span>
        </div>

        {/* Avg Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">متوسط الدرجات</span>
          <div className="text-2xl font-extrabold text-amber-600">{stats.avg_score}%</div>
          <span className="text-[11px] text-slate-500">المعدل العام</span>
        </div>

        {/* Pass Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">نسبة النجاح</span>
          <div className="text-2xl font-extrabold text-emerald-600">{stats.pass_rate}%</div>
          <span className="text-[11px] text-slate-500">{stats.passed_count} طالب ناجح</span>
        </div>

        {/* Highest Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">أعلى درجة</span>
          <div className="text-2xl font-extrabold text-blue-600">{stats.highest_score}%</div>
          <span className="text-[11px] text-slate-500">أفضل أداء</span>
        </div>

        {/* Lowest Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">أقل درجة</span>
          <div className="text-2xl font-extrabold text-rose-600">{stats.lowest_score}%</div>
          <span className="text-[11px] text-slate-500">أقل أداء</span>
        </div>

        {/* Needs Improvement */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400">يحتاجون تحسين</span>
          <div className="text-2xl font-extrabold text-rose-500">{stats.needs_improvement_count}</div>
          <span className="text-[11px] text-slate-500">أقل من 60%</span>
        </div>

      </div>

      {/* Grade Distribution Bar Histogram Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-navy-900">توزيع درجات الطلاب (Histogram)</h3>
            <p className="text-xs text-slate-500">يمثل توزيع الطلاب عبر المستويات المئوية المختارة</p>
          </div>
          <BarChart2 className="w-6 h-6 text-gold-500" />
        </div>

        <div className="grid grid-cols-5 gap-3 pt-4 items-end h-40">
          {Object.entries(stats.grade_distribution).map(([range, count]) => {
            const maxCount = Math.max(...Object.values(stats.grade_distribution), 1);
            const heightPercent = Math.max(Math.round((count / maxCount) * 100), 10);

            return (
              <div key={range} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-extrabold text-navy-900">{count} طالب</span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-xl transition-all duration-500 ${
                    range === '81-100'
                      ? 'bg-emerald-500'
                      : range === '61-80'
                      ? 'bg-blue-500'
                      : range === '41-60'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                ></div>
                <span className="text-xs font-bold text-slate-600">{range}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'students'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            جدول نتائج الطلاب ({filteredAttempts.length})
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'questions'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            تحليل الأسئلة ومستوى الصعوبة ({questionAnalysis.length})
          </button>
        </div>

        {/* Tab 1: Students Table */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
            
            {/* Search & Sort Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
                />
              </div>

              {/* Grade Filter */}
              {gradesList.length > 0 && (
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-navy-900"
                >
                  <option value="all">جميع الصفوف</option>
                  {gradesList.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-navy-900"
              >
                <option value="date_desc">أحدث إرسال أولاً</option>
                <option value="score_desc">الأعلى درجة أولاً</option>
                <option value="score_asc">الأقل درجة أولاً</option>
              </select>

            </div>

            {/* Table */}
            {filteredAttempts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-semibold text-sm">
                لا يوجد نتائج تطابق البحث الفعلي.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/50">
                      <th className="py-3.5 px-4 rounded-r-xl">اسم الطالب</th>
                      <th className="py-3.5 px-4">الصف</th>
                      <th className="py-3.5 px-4 text-center">الدرجة</th>
                      <th className="py-3.5 px-4 text-center">النسبة</th>
                      <th className="py-3.5 px-4 text-center">التقييم</th>
                      <th className="py-3.5 px-4 text-center">الإجابات</th>
                      <th className="py-3.5 px-4 text-center">وقت الإرسال</th>
                      <th className="py-3.5 px-4 text-left rounded-l-xl">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAttempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        onClick={() => navigate(`/tests/${test.id}/results/${attempt.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4 font-bold text-navy-900">
                          {attempt.student_name}
                        </td>

                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {attempt.grade}
                        </td>

                        <td className="py-4 px-4 text-center font-bold text-navy-900">
                          {attempt.score} / {attempt.total_score}
                        </td>

                        <td className="py-4 px-4 text-center font-extrabold text-slate-800">
                          {attempt.percentage}%
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              attempt.percentage >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : attempt.percentage >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : attempt.percentage >= 70
                                ? 'bg-indigo-100 text-indigo-800'
                                : attempt.percentage >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {attempt.rating || 'مكتمل'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center text-xs font-semibold">
                          <span className="text-emerald-600">✓ {attempt.score}</span>
                          <span className="text-slate-300 mx-1">|</span>
                          <span className="text-rose-600">✗ {attempt.total_score - attempt.score}</span>
                        </td>

                        <td className="py-4 px-4 text-center text-xs text-slate-500 font-medium">
                          {formatDateArabic(attempt.submitted_at)}
                        </td>

                        <td className="py-4 px-4 text-left">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-navy-900 hover:text-gold-600">
                            <span>عرض الإجابات</span>
                            <ChevronLeft className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Question Analysis Table */}
        {activeTab === 'questions' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-navy-900">تحليل الأسئلة ومدى صعوبتها</h3>
              <p className="text-xs text-slate-500">يُظهر نسبة الإجابات الصحيحة والخاطئة لكل سؤال لتقييم المفاهيم الصعبة لدى الطلاب</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/50">
                    <th className="py-3.5 px-4 rounded-r-xl">#</th>
                    <th className="py-3.5 px-4">نص السؤال</th>
                    <th className="py-3.5 px-4 text-center">النوع</th>
                    <th className="py-3.5 px-4 text-center">عدد المشاركات</th>
                    <th className="py-3.5 px-4 text-center text-emerald-600">إجابات صحيحة</th>
                    <th className="py-3.5 px-4 text-center text-rose-600">إجابات خاطئة</th>
                    <th className="py-3.5 px-4 text-center rounded-l-xl">نسبة النجاح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {questionAnalysis.map((q, idx) => (
                    <tr key={q.question_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-navy-900">{idx + 1}</td>
                      
                      <td className="py-4 px-4 font-semibold text-slate-800 max-w-md">
                        {q.question_text}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                          {q.question_type === 'multiple_choice' ? 'خيارات' : 'صح/خطأ'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        {q.total_responses}
                      </td>

                      <td className="py-4 px-4 text-center font-extrabold text-emerald-600">
                        {q.correct_count}
                      </td>

                      <td className="py-4 px-4 text-center font-extrabold text-rose-600">
                        {q.incorrect_count}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${q.success_rate}%` }}
                              className={`h-full rounded-full ${
                                q.success_rate >= 80
                                  ? 'bg-emerald-500'
                                  : q.success_rate >= 60
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                            ></div>
                          </div>
                          <span className={`text-xs font-extrabold ${
                            q.success_rate < 60 ? 'text-rose-600' : 'text-slate-800'
                          }`}>
                            {q.success_rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
