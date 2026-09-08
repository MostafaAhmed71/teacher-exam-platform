import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, LayoutDashboard, LogOut, Menu, X, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Hide Navbar completely on all student test views for clean distraction-free student experience
  if (location.pathname.startsWith('/test/')) {
    return null;
  }

  return (
    <header className="bg-navy-900 text-white shadow-lg sticky top-0 z-40 border-b border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <Link to={user ? "/dashboard" : "/login"} className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <img
              src="/logo.png"
              alt="شعار مقياس"
              className="h-9 sm:h-10 w-auto object-contain rounded-xl bg-white p-1 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-gold-400 transition-colors">
                مقياس
              </span>
              <span className="hidden sm:block text-[11px] text-gold-400 font-medium truncate">
                منصة الاختبارات والتقييم الإلكتروني
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user ? (
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'bg-navy-800 text-gold-400 border border-navy-700'
                      : 'text-slate-300 hover:text-white hover:bg-navy-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </Link>

                <Link
                  to="/tests/create"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  إنشاء اختبار جديد
                </Link>
              </nav>

              <div className="h-6 w-px bg-navy-700"></div>

              {/* User Profile & Logout */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-700">
                  <User className="w-4 h-4 text-gold-400" />
                  <span className="text-sm font-medium text-slate-200">{user.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/50"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </button>
              </div>
            </div>
          ) : null}

          {/* Mobile Menu Button */}
          {user && (
            <div className="md:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-navy-800 focus:outline-none"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && user && (
        <div className="md:hidden bg-navy-950 border-t border-navy-800 px-4 pt-2 pb-4 space-y-2">
          <div className="px-3 py-2 text-sm font-semibold text-gold-400 border-b border-navy-800 mb-2">
            أهلاً، {user.name}
          </div>
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-navy-800 text-sm font-semibold"
          >
            <LayoutDashboard className="w-5 h-5 text-gold-400" />
            لوحة التحكم
          </Link>
          <Link
            to="/tests/create"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy-950 bg-gold-500 hover:bg-gold-400 text-sm font-bold"
          >
            <PlusCircle className="w-5 h-5" />
            إنشاء اختبار جديد
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-300 hover:bg-rose-950/40 text-sm font-semibold border border-rose-900/40"
          >
            <LogOut className="w-5 h-5 text-rose-400" />
            تسجيل الخروج
          </button>
        </div>
      )}
    </header>
  );
};
