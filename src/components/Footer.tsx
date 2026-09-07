import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const location = useLocation();

  // Hide footer on test taking page for clean experience
  if (location.pathname.endsWith('/start')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>منصة الاختبارات للمعلمين - آمنة، دقيقة، ومصححة تلقائيًا</span>
          </div>

          <div className="flex items-center gap-1">
            <span>صُنعت بكل</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline" />
            <span>لتسهيل العملية التعليمية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
