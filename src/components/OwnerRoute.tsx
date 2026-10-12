import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { licenseService } from '../services/licenseService';
import type { OwnerStatus } from '../types';
import { ShieldAlert, ShieldCheck, KeyRound, Lock, Mail, ArrowLeft, LogOut, UserPlus, LogIn, User } from 'lucide-react';
import { useToast } from './Toast';

export const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { showToast } = useToast();

  const [checkingOwner, setCheckingOwner] = useState(true);
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Standalone Owner Login / Register State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [ownerName, setOwnerName] = useState('مالك المنصة');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyOwner() {
      if (!user) {
        setCheckingOwner(false);
        return;
      }
      try {
        const status = await licenseService.checkIsOwner();
        if (isMounted) {
          setOwnerStatus(status);
        }
      } catch (err) {
        console.error('Owner check failed:', err);
      } finally {
        if (isMounted) {
          setCheckingOwner(false);
        }
      }
    }

    if (!authLoading) {
      verifyOwner();
    }

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const handleOwnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      if (authMode === 'register') {
        // Create new Owner Account in Supabase
        const res = await register(ownerName.trim() || 'مالك المنصة', ownerEmail.trim(), ownerPassword);
        if (res.success) {
          showToast('تم إنشاء حساب المالك بنجاح! جاري التثبيت كمالك رئيسي...', 'success');
          // Automatically claim initial owner
          await licenseService.claimInitialOwner();
          const status = await licenseService.checkIsOwner();
          setOwnerStatus(status);
        } else {
          showToast(res.error || 'فشل إنشاء حساب المالك في Supabase', 'error');
        }
      } else {
        // Sign in existing account
        const res = await login(ownerEmail.trim(), ownerPassword);
        if (res.success) {
          showToast('تم التحقق بنجاح، جاري فحص صلاحية المالك...', 'success');
          const status = await licenseService.checkIsOwner();
          setOwnerStatus(status);
          if (!status.is_owner && !status.is_initial_setup) {
            showToast('هذا الحساب ليس مسجلاً كمالك في قاعدة البيانات', 'error');
          }
        } else {
          showToast(
            res.error?.includes('Invalid login credentials')
              ? 'بيانات الدخول غير صحيحة. إذا كانت هذه أول مرة تسجل فيها، اختر تبويب "إنشاء حساب جديد للمالك" في الأعلى.'
              : res.error || 'خطأ في بيانات تسجيل دخول المالك',
            'error'
          );
        }
      }
    } catch {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClaimOwner = async () => {
    setClaiming(true);
    try {
      const res = await licenseService.claimInitialOwner();
      if (res.success) {
        showToast(res.message, 'success');
        setOwnerStatus({ is_owner: true, authenticated: true, is_initial_setup: false });
      } else {
        showToast(res.message || 'حدث خطأ أثناء تعيين المالك', 'error');
      }
    } catch {
      showToast('تعذر تعيين صلاحية المالك', 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading || checkingOwner) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-gold-500 rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">جاري الاتصال بقاعدة البيانات والتحقق من صلاحية المالك...</p>
      </div>
    );
  }

  // Not logged in -> Show Standalone Owner Login/Register Portal (completely separate from teacher login)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-gold-500 via-amber-400 to-navy-900"></div>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center mx-auto shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white">بوابة المالك المركزية</h1>
            <p className="text-xs text-slate-400 font-semibold">
              لوحة التحكم المستقلة بإدارة تراخيص المواقع والعملاء
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-gold-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-gold-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إنشاء حساب مالك جديد</span>
            </button>
          </div>

          <form onSubmit={handleOwnerAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المالك</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="مالك المنصة"
                    className="w-full pr-9 pl-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني للمالك</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="moahmed7412@gmail.com"
                  className="w-full pr-9 pl-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-9 pl-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 dir-ltr text-right"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{authMode === 'register' ? 'إنشاء حساب المالك والدخول' : 'تسجيل الدخول كمالك'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-500 font-semibold">
              هذه الواجهة مخصصة لمالك المنصة فقط ومنفصلة تماماً عن حسابات المعلمين والطلاب.
            </span>
          </div>

        </div>
      </div>
    );
  }

  // Initial setup open -> allow master setup
  if (ownerStatus?.is_initial_setup && !ownerStatus?.is_owner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center mx-auto shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">تهيئة المالك للمرة الأولى</h2>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              تم تسجيل دخولك بنجاح كـ ({user.email}). لم يتم تسجيل مالك رئيسي في قاعدة البيانات بعد. اضغط أدناه لتعيين حسابك كمالك رسمي للمنصة.
            </p>
          </div>

          <button
            onClick={handleClaimOwner}
            disabled={claiming}
            className="w-full py-3.5 px-4 bg-gold-500 hover:bg-gold-400 text-slate-950 font-black rounded-xl shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50 cursor-pointer"
          >
            {claiming ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>تعيين حسابي كمالك رئيسي للمنصة</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Logged in as normal teacher without owner permission
  if (!ownerStatus?.is_owner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/50 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-rose-200">غير مصرح بالدخول كمالك</h2>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              الحساب الحالي ({user.email}) مسجل كحساب عادي وليس له صلاحيات مالك على الخادم.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>تسجيل الخروج والتبديل لحساب المالك</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
