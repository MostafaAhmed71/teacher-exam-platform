import React from 'react';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const location = useLocation();

  // Hide footer on student test routes for clean student experience
  if (location.pathname.startsWith('/test/')) {
    return null;
  }

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-4 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs font-semibold text-slate-400">
        <span>جميع الحقوق محفوظة © {new Date().getFullYear()} - منصة الاختبارات الإلكترونية</span>
      </div>
    </footer>
  );
};
