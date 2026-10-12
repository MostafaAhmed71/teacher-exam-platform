import type { Attempt, Test } from '../types';
import { formatDateArabic } from './helpers';

/**
 * تصدير نتائج الطلاب للاختبار إلى ملف CSV متوافق مع Excel واللغة العربية
 */
export function exportAttemptsToCsv(test: Test, attempts: Attempt[]) {
  const headers = [
    'اسم الطالب',
    'الصف / الشعبة',
    'الدرجة المحرزة',
    'الدرجة الكلية',
    'النسبة المئوية',
    'التقييم',
    'تاريخ ووقت التسليم'
  ];

  const rows = attempts.map((a) => [
    `"${a.student_name.replace(/"/g, '""')}"`,
    `"${a.grade.replace(/"/g, '""')}"`,
    a.score,
    a.total_score,
    `"${a.percentage}%"`,
    `"${a.rating || '-'}"`,
    `"${formatDateArabic(a.submitted_at || a.created_at || '')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // إضافة UTF-8 BOM (\uFEFF) لضمان قراءة ملف Excel للنصوص العربية بشكل صحيح
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanTitle = test.title.replace(/[^\w\u0621-\u064A\s-]/gi, '').trim() || 'نتائج-الاختبار';
  link.setAttribute('download', `${cleanTitle}-نتائج-الطلاب.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * تصدير سجل تدقيق التراخيص إلى ملف CSV
 */
export function exportAuditLogsToCsv(logs: any[]) {
  const headers = [
    'التاريخ والوقت',
    'اسم العميل',
    'الحالة السابقة',
    'الحالة الجديدة',
    'السبب',
    'المنفّذ'
  ];

  const rows = logs.map((l) => [
    `"${new Date(l.created_at).toLocaleString('ar-EG')}"`,
    `"${(l.client_name || '').replace(/"/g, '""')}"`,
    `"${l.previous_status === 'active' ? 'نشط' : 'متوقف'}"`,
    `"${l.new_status === 'active' ? 'نشط' : 'متوقف'}"`,
    `"${(l.reason || '').replace(/"/g, '""')}"`,
    `"${(l.performed_by || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `سجل-تدقيق-تراخيص-المنصة-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
