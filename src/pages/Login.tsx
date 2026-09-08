import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/Toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        showToast('تم تسجيل الدخول بنجاح', 'success');
        navigate(from, { replace: true });
      } else {
        showToast(res.error || 'خطأ في البريد الإلكتروني أو كلمة المرور', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ غير متوقع', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-5 sm:p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        
        {/* Top Gold Accent Strip */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-gold-500 via-gold-400 to-navy-900"></div>

        {/* Brand Header with Logo Image */}
        <div className="text-center space-y-3">
          <img
            src="/logo.png"
            alt="شعار منصة مقياس"
            className="w-32 h-auto mx-auto object-contain drop-shadow-md"
          />

          <div>
            <h1 className="text-3xl font-black text-navy-900 tracking-tight">
              مقياس
            </h1>
            <p className="mt-1 text-xs font-bold text-gold-600">
              منصة الاختبارات والتقييم الإلكتروني
            </p>
          </div>
          <p className="text-xs text-slate-500 font-semibold pt-1">
            سجل دخول المعلم لإدارة الاختبارات والتقارير
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full pr-9 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-sm font-medium transition-colors dir-ltr text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-9 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900 focus:border-navy-900 text-sm font-medium transition-colors dir-ltr text-right"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 text-white font-extrabold rounded-xl shadow-lg shadow-navy-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-gold-500 rounded-full animate-spin"></div>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowLeft className="w-4 h-4 text-gold-400" />
              </>
            )}
          </button>
        </form>

        {/* Features Checklist */}
        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-600 font-semibold border border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تصحيح إلكتروني تلقائي فوري</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>منع تكرار المحاولة وسرقة الإجابات</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تقارير تحليلية لمستوى صعوبة الأسئلة</span>
          </div>
        </div>

      </div>
    </div>
  );
};
