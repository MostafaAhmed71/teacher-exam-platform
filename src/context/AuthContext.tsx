import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Teacher } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: Teacher | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const current = await authService.getCurrentUser();
        setUser(current);
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedUser, error } = await authService.login(email, password);
    if (error || !loggedUser) {
      return { success: false, error: error || 'فشل تسجيل الدخول' };
    }
    setUser(loggedUser);
    return { success: true };
  };

  const register = async (name: string, email: string, password: string) => {
    const { user: registeredUser, error } = await authService.register(name, email, password);
    if (error || !registeredUser) {
      return { success: false, error: error || 'فشل إنشاء الحساب' };
    }
    setUser(registeredUser);
    return { success: true };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
