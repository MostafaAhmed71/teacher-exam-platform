import React from 'react';
import { useLicense } from '../context/LicenseContext';
import { Database } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const LicenseBanner: React.FC = () => {
  const { isSuspended } = useLicense();
  const location = useLocation();

  // Hide banner if license is active or when browsing owner portal
  if (!isSuspended || location.pathname.startsWith('/owner')) {
    return null;
  }

  return (
    <div className="bg-navy-900 text-white border-b border-gold-500/40 shadow-md relative z-30 transition-all" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center sm:justify-start gap-3 text-center sm:text-right">
          
          <div className="w-8 h-8 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0 shadow-inner">
            <Database className="w-4 h-4 text-gold-400 animate-pulse" />
          </div>

          <div>
            <h4 className="font-extrabold text-sm text-gold-300">
              تم انتهاء الحصة المجانية لقاعدة البيانات
            </h4>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              تم تعليق العمليات المحمية مؤقتاً. تبقى إمكانية مراجعة وتصدير البيانات الحالية متاحة.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
