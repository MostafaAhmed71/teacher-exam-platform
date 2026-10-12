import React, { useEffect, useState } from 'react';
import { licenseService } from '../services/licenseService';
import type { ClientLicense, LicenseAuditLog, LicenseStatus } from '../types';
import { useLicense } from '../context/LicenseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { exportAuditLogsToCsv } from '../utils/exportHelpers';
import {
  Shield,
  ShieldAlert,
  Power,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  History,
  FileSpreadsheet,
  Globe,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Database,
  LogOut
} from 'lucide-react';

export const OwnerLicenses: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { refreshLicense } = useLicense();

  const [licenses, setLicenses] = useState<ClientLicense[]>([]);
  const [auditLogs, setAuditLogs] = useState<LicenseAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'licenses' | 'audit'>('licenses');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal: Toggle status confirmation
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<ClientLicense | null>(null);
  const [targetStatus, setTargetStatus] = useState<LicenseStatus>('suspended');
  const [suspensionReasonInput, setSuspensionReasonInput] = useState('تم انتهاء الحصة المجانية لقاعدة البيانات');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal: Create / Edit License
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLicenseId, setFormLicenseId] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formClientEmail, setFormClientEmail] = useState('');
  const [formProjectDomain, setFormProjectDomain] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [licensesData, logsData] = await Promise.all([
        licenseService.getLicenses(),
        licenseService.getAuditLogs()
      ]);
      setLicenses(licensesData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Error loading licenses data:', err);
      showToast('حدث خطأ أثناء تحميل بيانات التراخيص', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenToggleModal = (license: ClientLicense, nextStatus: LicenseStatus) => {
    setSelectedLicense(license);
    setTargetStatus(nextStatus);
    setSuspensionReasonInput(license.suspension_reason || 'تم انتهاء الحصة المجانية لقاعدة البيانات');
    setToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!selectedLicense) return;
    setActionLoading(true);

    try {
      const res = await licenseService.toggleLicense(
        selectedLicense.id,
        targetStatus,
        targetStatus === 'suspended' ? suspensionReasonInput : 'تم إعادة تفعيل الترخيص بنجاح'
      );

      if (res.success) {
        showToast(
          targetStatus === 'active'
            ? 'تم تفعيل ترخيص الموقع بنجاح واستئناف كافة الخدمات'
            : 'تم إيقاف ترخيص الموقع وتعليق العمليات المحمية',
          'success'
        );
        setToggleModalOpen(false);
        await Promise.all([loadAllData(), refreshLicense()]);
      } else {
        showToast(res.error || 'فشل تغيير حالة الترخيص', 'error');
      }
    } catch {
      showToast('حدث خطأ غير متوقع', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormLicenseId('');
    setFormProjectName('منصة مقياس للاختبارات');
    setFormClientName('');
    setFormClientEmail('');
    setFormProjectDomain('amr-exam-platform.vercel.app');
    setFormNotes('');
    setEditModalOpen(true);
  };

  const handleOpenEditModal = (item: ClientLicense) => {
    setIsEditing(true);
    setFormLicenseId(item.id);
    setFormProjectName(item.project_name);
    setFormClientName(item.client_name);
    setFormClientEmail(item.client_email || '');
    setFormProjectDomain(item.project_domain || '');
    setFormNotes(item.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveLicenseForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim() || !formProjectName.trim()) {
      showToast('يرجى ملء اسم العميل والمشروع', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (isEditing && formLicenseId) {
        const res = await licenseService.updateLicense(formLicenseId, {
          project_name: formProjectName,
          client_name: formClientName,
          client_email: formClientEmail,
          project_domain: formProjectDomain,
          notes: formNotes
        });
        if (res.success) {
          showToast('تم تحديث بيانات ترخيص العميل بنجاح', 'success');
          setEditModalOpen(false);
          await loadAllData();
        } else {
          showToast(res.error || 'فشل التحديث', 'error');
        }
      } else {
        const res = await licenseService.createLicense({
          project_name: formProjectName,
          client_name: formClientName,
          client_email: formClientEmail,
          project_domain: formProjectDomain,
          notes: formNotes,
          status: 'active',
          suspension_reason: 'تم انتهاء الحصة المجانية لقاعدة البيانات'
        });
        if (res.success) {
          showToast('تم إنشاء ترخيص العميل الجديد بنجاح', 'success');
          setEditModalOpen(false);
          await loadAllData();
        } else {
          showToast(res.error || 'فشل إنشاء الترخيص', 'error');
        }
      }
    } catch {
      showToast('حدث خطأ أثناء حفظ بيانات الترخيص', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Licenses
  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch =
      lic.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lic.project_domain || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = licenses.filter((l) => l.status === 'active').length;
  const suspendedCount = licenses.filter((l) => l.status === 'suspended').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-tajawal antialiased selection:bg-gold-500 selection:text-black" dir="rtl">
      
      {/* Standalone Owner Portal Topbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">بوابة المالك المركزية</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  خادم آمن RLS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                لوحة تحكم تراخيص المواقع والعملاء المستقلة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 hidden sm:inline-block dir-ltr">
                {user.email}
              </span>
            )}
            <button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 px-3.5 py-1.5 rounded-xl border border-rose-800/40 transition-colors cursor-pointer"
              title="تسجيل خروج من بوابة المالك"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-navy-950 via-navy-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-navy-800">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-gold-500 via-gold-400 to-navy-900"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gold-500/20 text-gold-300 border border-gold-500/30">
                <Shield className="w-3.5 h-3.5 text-gold-400" />
                لوحة تحكم المالك الرسمية
              </span>
              <span className="text-xs text-slate-400 font-semibold">• محمي بسياسات RLS على الخادم</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              إدارة تراخيص تشغيل المواقع
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
              تفعيل وإيقاف تشغيل المواقع للعملاء مع التحقق على مستوى الخادم (Server-Side) وحفظ البيانات تلقائياً، مع إتاحة التصدير عند التعليق.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة ترخيص عميل</span>
            </button>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-navy-800">
          <div className="bg-navy-900/80 p-3.5 rounded-2xl border border-navy-800/80">
            <div className="text-xs font-bold text-slate-400">إجمالي تراخيص المواقع</div>
            <div className="text-2xl font-black text-white mt-1">{licenses.length}</div>
          </div>
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-800/40">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              التراخيص النشطة
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{activeCount}</div>
          </div>
          <div className="bg-rose-950/40 p-3.5 rounded-2xl border border-rose-800/40 col-span-2 sm:col-span-1">
            <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              المواقع الموقوفة
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">{suspendedCount}</div>
          </div>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'licenses'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>قائمة تراخيص العملاء ({licenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل تدقيق العمليات (Audit Logs) ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Licenses List */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                placeholder="بحث باسم العميل، المشروع، أو النطاق..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-navy-900"
              >
                <option value="all">كل الحالات ({licenses.length})</option>
                <option value="active">النشطة فقط ({activeCount})</option>
                <option value="suspended">الموقوفة فقط ({suspendedCount})</option>
              </select>
            </div>
          </div>

          {/* Cards & Table */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-9 h-9 border-4 border-navy-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500 mt-3">جاري تحميل تراخيص المواقع...</p>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm space-y-3">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-navy-900">لا توجد تراخيص مطابقة للبحث</h3>
              <p className="text-xs text-slate-500 font-medium">يمكنك تغيير معايير البحث أو إضافة ترخيص جديد للعميل.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredLicenses.map((lic) => {
                const isActive = lic.status === 'active';

                return (
                  <div
                    key={lic.id}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-sm ${
                      isActive
                        ? 'border-slate-100 hover:border-slate-300'
                        : 'border-rose-200 bg-rose-50/20 shadow-rose-100/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Info */}
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-black text-navy-900 truncate">
                            {lic.client_name}
                          </h3>

                          {/* Status Badge */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              الترخيص نشط
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              الترخيص متوقف
                            </span>
                          )}

                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                            {lic.project_name}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-600 flex-wrap">
                          {lic.project_domain && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span className="dir-ltr">{lic.project_domain}</span>
                            </div>
                          )}

                          {lic.client_email && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                              <span>البريد:</span>
                              <span className="dir-ltr">{lic.client_email}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 font-medium text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>آخر تعديل: {lic.updated_at ? new Date(lic.updated_at).toLocaleDateString('ar-EG') : 'الآن'}</span>
                          </div>
                        </div>

                        {/* Suspension Note if Suspended */}
                        {!isActive && (
                          <div className="bg-rose-100/70 text-rose-900 text-xs font-bold px-3 py-2 rounded-xl border border-rose-200/80 flex items-center gap-2">
                            <Database className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>سبب الإيقاف الموجه للعميل: "{lic.suspension_reason}"</span>
                          </div>
                        )}

                        {lic.notes && (
                          <p className="text-xs text-slate-500 font-medium italic">
                            ملاحظة المالك: {lic.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <button
                          onClick={() => handleOpenEditModal(lic)}
                          className="p-2.5 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          title="تعديل بيانات العميل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {isActive ? (
                          <button
                            onClick={() => handleOpenToggleModal(lic, 'suspended')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                          >
                            <Power className="w-4 h-4" />
                            <span>إيقاف الترخيص</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenToggleModal(lic, 'active')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <Power className="w-4 h-4" />
                            <span>تفعيل الترخيص</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-navy-900">سجل تدقيق العمليات الآلي (Audit Trail)</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                يسجل كل تغيير في حالة التراخيص مع الوقت وهوية المنفّذ والسبب.
              </p>
            </div>

            <button
              onClick={() => exportAuditLogsToCsv(auditLogs)}
              disabled={auditLogs.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-gold-400" />
              <span>تصدير السجل (CSV)</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm space-y-2">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-navy-900">لا توجد عمليات مسجلة في السجل بعد</h4>
              <p className="text-xs text-slate-500 font-medium">سيتم تسجيل كل حركة تفعيل أو إيقاف تجريها هنا تلقائياً.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-black text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-4">التاريخ والوقت</th>
                      <th className="py-3 px-4">اسم العميل</th>
                      <th className="py-3 px-4">الحركة</th>
                      <th className="py-3 px-4">السبب المسجل</th>
                      <th className="py-3 px-4">المنفّذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-semibold whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('ar-EG')}
                        </td>
                        <td className="py-3 px-4 font-bold text-navy-900 whitespace-nowrap">
                          {log.client_name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.new_status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              تفعيل (نشط)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              إيقاف (متوقف)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold max-w-xs truncate">
                          {log.reason || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-semibold dir-ltr text-right whitespace-nowrap">
                          {log.performed_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Confirm Toggle Status */}
      <Modal
        isOpen={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        title={targetStatus === 'suspended' ? 'تأكيد إيقاف ترخيص الموقع' : 'تأكيد تفعيل ترخيص الموقع'}
      >
        <div className="space-y-4 text-right" dir="rtl">
          {targetStatus === 'suspended' ? (
            <div className="space-y-3">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm text-rose-950 mb-1">
                    هل أنت متأكد من رغبتك في إيقاف ترخيص عميل ({selectedLicense?.client_name})؟
                  </p>
                  <p>
                    سيتم منع العمليات المحمية من جهة الخادم (إنشاء وتعديل الاختبارات وتقديم الطلاب للإجابات). وستظهر للعميل رسالة واضحة بانتهاء الحصة المجانية لقاعدة البيانات، مع الاحتفاظ بكامل بياناته وإمكانية تصديرها.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرسالة التي ستظهر للعميل:
                </label>
                <input
                  type="text"
                  value={suspensionReasonInput}
                  onChange={(e) => setSuspensionReasonInput(e.target.value)}
                  placeholder="تم انتهاء الحصة المجانية لقاعدة البيانات"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
                />
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm text-emerald-950 mb-1">
                  إعادة تفعيل ترخيص ({selectedLicense?.client_name})
                </p>
                <p>
                  سيعود الموقع للعمل فوراً وبكامل الصلاحيات مع الحفاظ التام على جميع الاختبارات ونتائج الطلاب المسجلة دون أي فقدان للبيانات.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setToggleModalOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              onClick={handleConfirmToggle}
              disabled={actionLoading}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                targetStatus === 'suspended'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>تأكيد {targetStatus === 'suspended' ? 'الإيقاف' : 'التفعيل'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Create or Edit License */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isEditing ? 'تعديل بيانات ترخيص العميل' : 'إضافة ترخيص عميل / موقع جديد'}
      >
        <form onSubmit={handleSaveLicenseForm} className="space-y-4 text-right" dir="rtl">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل / المعلم *</label>
            <input
              type="text"
              required
              value={formClientName}
              onChange={(e) => setFormClientName(e.target.value)}
              placeholder="مثال: الأستاذ عمرو حميصة"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المشروع / المنصة *</label>
            <input
              type="text"
              required
              value={formProjectName}
              onChange={(e) => setFormProjectName(e.target.value)}
              placeholder="مثال: منصة مقياس للاختبارات"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نطاق الموقع (Domain)</label>
            <input
              type="text"
              value={formProjectDomain}
              onChange={(e) => setFormProjectDomain(e.target.value)}
              placeholder="amr-exam-platform.vercel.app"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للعميل</label>
            <input
              type="email"
              value={formClientEmail}
              onChange={(e) => setFormClientEmail(e.target.value)}
              placeholder="client@school.edu"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات داخلية للمالك</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="تفاصيل الاتفاق اليدوي، تاريخ السداد، إلخ..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-900"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-gold-500 rounded-full animate-spin"></div>
              ) : (
                <span>{isEditing ? 'حفظ التعديلات' : 'إضافة الترخيص'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      </div>
    </div>
  );
};
