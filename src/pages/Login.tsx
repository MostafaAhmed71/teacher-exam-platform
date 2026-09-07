import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, User, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/Toast';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          showToast('الرجاء كتابة اسم المعلم', 'error');
          setLoading(false);
          return;
        }
        const res = await register(name, email, password);
        if (res.success) {
          showToast('تم إنشاء حساب المعلم بنجاح!', 'success');
          navigate(from, { replace: true });
        } else {
          showToast(res.error || 'فشل إنشاء الحساب', 'error');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          showToast('تم تسجيل الدخول بنجاح', 'success');
          navigate(from, { replace: true });
        } else {
          showToast(res.error || 'خطأ في البريد الإلكتروني أو كلمة المرور', 'error');
        }
      }
    } catch (err) {
      showToast('حدث خطأ غير متوقع', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    const res = await login('teacher@demo.com', '123456');
    if (res.success) {
      showToast('تم تسجيل الدخول بالحساب التجريبي', 'success');
      navigate('/dashboard', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        
        {/* Top Gold Accent Strip */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-gold-500 via-gold-400 to-navy-900"></div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center text-gold-400 shadow-lg mb-4">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            منصة الاختبارات للمعلمين
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            {isRegister ? 'أنشئ حسابك لبدء تقديم الاختبارات الإلكترونية' : 'سجل دخولك لإدارة اختباراتك ونتائج الطلاب'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              !isRegister ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              isRegister ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم المعلم / المعلمة</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required={isRegister}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسمك الثلاثي"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-sm font-medium transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-sm font-medium transition-colors dir-ltr text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-sm font-medium transition-colors dir-ltr text-right"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl shadow-lg shadow-navy-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-gold-500 rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegister ? 'إنشاء الحساب والبدء' : 'تسجيل الدخول'}</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Option */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gold-50 hover:bg-gold-100 text-gold-900 border border-gold-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4 text-gold-600" />
            <span>تجربة المنصة مباشرة (حساب تجريبي)</span>
          </button>
          <p className="mt-2 text-xs text-slate-400">يمكنك الدخول بضغطة زر دون الحاجة لإنشاء حساب حقيقي للاختبار.</p>
        </div>

        {/* Features Checklist */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تصحيح تلقائي فور تسليم الطالب</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>منع تكرار تقديم الاختبار Server-Side</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تقارير رسومية وتحليل مستوى الأسئلة</span>
          </div>
        </div>

      </div>
    </div>
  );
};
