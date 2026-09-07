import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testService } from '../services/testService';
import type { Test, TestStatus } from '../types';
import { copyToClipboard, generateWhatsAppShareUrl } from '../utils/helpers';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import {
  FileText,
  CheckCircle2,
  Users,
  Award,
  PlusCircle,
  Search,
  Share2,
  ExternalLink,
  Edit3,
  BarChart3,
  Power,
  Trash2,
  Copy,
  Clock,
  BookOpen
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTestForShare, setSelectedTestForShare] = useState<Test | null>(null);

  useEffect(() => {
    loadTests();
  }, [user]);

  const loadTests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await testService.getTests(user.id);
      setTests(data);
    } catch (err) {
      console.error('Error loading tests:', err);
      showToast('حدث خطأ أثناء تحميل الاختبارات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (test: Test) => {
    const nextStatus: TestStatus =
      test.status === 'published' ? 'stopped' : 'published';
    
    try {
      await testService.toggleTestStatus(test.id, nextStatus);
      showToast(
        nextStatus === 'published' ? 'تم نشر الاختبار بنجاح' : 'تم إيقاف الاختبار',
        'success'
      );
      loadTests();
    } catch (err) {
      showToast('فشل تغيير حالة الاختبار', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!testToDelete) return;
    try {
      await testService.deleteTest(testToDelete.id);
      showToast('تم حذف الاختبار بنجاح', 'success');
      setDeleteModalOpen(false);
      setTestToDelete(null);
      loadTests();
    } catch (err) {
      showToast('فشل حذف الاختبار', 'error');
    }
  };

  const handleCopyLink = async (testId: string) => {
    const url = `${window.location.origin}/test/${testId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      showToast('تم نسخ رابط الاختبار بنجاح', 'success');
    } else {
      showToast('تعذر نسخ الرابط', 'error');
    }
  };

  // Metrics computation
  const totalTests = tests.length;
  const publishedTests = tests.filter((t) => t.status === 'published').length;
  const totalStudents = tests.reduce((acc, curr) => acc + (curr.attempts_count || 0), 0);
  const avgScoresList = tests.filter((t) => (t.attempts_count || 0) > 0).map((t) => t.avg_score || 0);
  const overallAvgScore = avgScoresList.length > 0
    ? Math.round(avgScoresList.reduce((a, b) => a + b, 0) / avgScoresList.length)
    : 0;

  // Filtered tests
  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.grade.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' ? true : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-navy-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-navy-800 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30">
            أهلاً بعودتك، معلمنا الفاضل
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            لوحة تحكم منصة مقياس للاختبارات الإلكترونية
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl font-medium">
            قم بإنشاء وتعديل ونشر الاختبارات، متابعة أداء الطلاب في الوقت الفعلي، وتنزيل التقارير والتصحيح التلقائي.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <Link
            to="/tests/create"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-5 h-5" />
            <span>إنشاء اختبار جديد</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Tests */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">عدد الاختبارات</span>
            <div className="text-3xl font-extrabold text-navy-900">{totalTests}</div>
            <span className="text-xs text-slate-500 font-medium">اختبار مُنشأ</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-900 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Published Tests */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">الاختبارات المنشورة</span>
            <div className="text-3xl font-extrabold text-emerald-600">{publishedTests}</div>
            <span className="text-xs text-slate-500 font-medium">متاحة للحل الآن</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">عدد الطلاب المشاركين</span>
            <div className="text-3xl font-extrabold text-blue-600">{totalStudents}</div>
            <span className="text-xs text-slate-500 font-medium">محاولة مكتملة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Overall Average */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">متوسط الدرجات العام</span>
            <div className="text-3xl font-extrabold text-amber-600">{overallAvgScore}%</div>
            <span className="text-xs text-slate-500 font-medium">نسبة النجاح العامة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Tests Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
        
        {/* Table Header Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy-900">جدول الاختبارات</h2>
            <p className="text-xs text-slate-500 font-medium">إدارة جميع الاختبارات والروابط والنتائج</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                placeholder="بحث باسم الاختبار أو المادة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
            >
              <option value="all">كل الحالات</option>
              <option value="published">منشور فقط</option>
              <option value="draft">مسودة</option>
              <option value="stopped">متوقف</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-500 text-sm font-semibold">جاري تحميل قائمة الاختبارات...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-200/60 text-slate-500 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy-900">لا يوجد اختبارات مضافة حالياً</h3>
              <p className="text-xs text-slate-500">ابدأ بإنشاء أول اختبار لك وإرساله للطلاب للبدء بالتصحيح التلقائي.</p>
            </div>
            <Link
              to="/tests/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء اختبارك الأول</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-4 rounded-r-xl">الاختبار</th>
                  <th className="py-3.5 px-4">المادة</th>
                  <th className="py-3.5 px-4">الصف</th>
                  <th className="py-3.5 px-4 text-center">الأسئلة</th>
                  <th className="py-3.5 px-4 text-center">المشاركون</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-left rounded-l-xl">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTests.map((test) => {
                  const testUrl = `${window.location.origin}/test/${test.id}`;

                  return (
                    <tr key={test.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Title & Code */}
                      <td className="py-4 px-4 font-bold text-navy-900 max-w-xs">
                        <div className="truncate" title={test.title}>{test.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            {test.id}
                          </span>
                          {test.duration_minutes && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {test.duration_minutes} دقيقة
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-4 px-4 text-slate-700 font-semibold">{test.subject}</td>

                      {/* Grade */}
                      <td className="py-4 px-4 text-slate-700 font-semibold">{test.grade}</td>

                      {/* Questions Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-100 text-navy-900 font-bold text-xs">
                          {test.questions_count || 0} سؤال
                        </span>
                      </td>

                      {/* Participants Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                          {test.attempts_count || 0} طالب
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {test.status === 'published' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            منشور
                          </span>
                        )}
                        {test.status === 'draft' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            مسودة
                          </span>
                        )}
                        {test.status === 'stopped' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            متوقف
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-left">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Open Live Test Link */}
                          <a
                            href={testUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح صفحة الاختبار للطالب"
                            className="p-2 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Edit Test */}
                          <Link
                            to={`/tests/${test.id}/edit`}
                            title="تعديل الاختبار والأسئلة"
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* View Results */}
                          <Link
                            to={`/tests/${test.id}/results`}
                            title="عرض النتائج والتقارير"
                            className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Link>

                          {/* Share Link Modal */}
                          <button
                            onClick={() => {
                              setSelectedTestForShare(test);
                              setShareModalOpen(true);
                            }}
                            title="مشاركة / نسخ رابط الاختبار"
                            className="p-2 text-slate-600 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Stopped */}
                          <button
                            onClick={() => handleToggleStatus(test)}
                            title={test.status === 'published' ? 'إيقاف الاختبار' : 'نشر الاختبار'}
                            className={`p-2 rounded-lg transition-colors ${
                              test.status === 'published'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setTestToDelete(test);
                              setDeleteModalOpen(true);
                            }}
                            title="حذف الاختبار"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Share Modal */}
      {selectedTestForShare && (
        <Modal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedTestForShare(null);
          }}
          title="مشاركة رابط الاختبار"
        >
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-navy-900 text-sm mb-1">{selectedTestForShare.title}</h4>
              <p className="text-xs text-slate-500">المادة: {selectedTestForShare.subject} | الصف: {selectedTestForShare.grade}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">رابط الاختبار الفريد:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/test/${selectedTestForShare.id}`}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 dir-ltr text-right"
                />
                <button
                  onClick={() => handleCopyLink(selectedTestForShare.id)}
                  className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ</span>
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">خيارات المشاركة السريعة:</label>
              
              <a
                href={generateWhatsAppShareUrl(
                  selectedTestForShare.title,
                  `${window.location.origin}/test/${selectedTestForShare.id}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة عبر WhatsApp</span>
              </a>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
              <strong>نص الرسالة المقترح:</strong>
              <br />
              "اختبار [{selectedTestForShare.title}]
              <br />
              يرجى الدخول إلى الرابط التالي وإكمال الاختبار:
              <br />
              {`${window.location.origin}/test/${selectedTestForShare.id}`}"
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {testToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setTestToDelete(null);
          }}
          title="تأكيد حذف الاختبار"
        >
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
              هل أنت متأكد من حذف الاختبار <strong className="text-rose-600 font-bold">"{testToDelete.title}"</strong>؟
            </p>
            <p className="text-xs text-slate-500 bg-rose-50 p-3 rounded-xl border border-rose-200">
              سيتم حذف الاختبار وجميع الأسئلة وإجابات ونتائج الطلاب المرتبطة به نهائيًا ولا يمكن التراجع عن هذه العملية.
            </p>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTestToDelete(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
