import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Teacher } from '../types';

const MOCK_TEACHER_KEY = 'teacher_platform_mock_user';

export const authService = {
  async login(email: string, password: string): Promise<{ user: Teacher | null; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch teacher profile
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const teacher: Teacher = teacherData || {
          id: data.user.id,
          name: data.user.user_metadata?.name || 'المعلم',
          email: data.user.email || email,
        };

        return { user: teacher, error: null };
      }
    }

    // Mock Login Fallback (For demo/local dev)
    if (email && password.length >= 6) {
      const mockTeacher: Teacher = {
        id: 'teacher-demo-id',
        name: email.split('@')[0] || 'المعلم الأستاذ',
        email: email,
      };
      localStorage.setItem(MOCK_TEACHER_KEY, JSON.stringify(mockTeacher));
      return { user: mockTeacher, error: null };
    }

    return { user: null, error: 'الرجاء إدخال بريد إلكتروني وكلمة مرور صحيحة (6 أحرف على الأقل)' };
  },

  async register(name: string, email: string, password: string): Promise<{ user: Teacher | null; error: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const teacher: Teacher = {
          id: data.user.id,
          name,
          email,
        };
        
        // Explicit insert into teachers table in case trigger didn't catch
        await supabase.from('teachers').upsert({
          id: data.user.id,
          name,
          email,
        });

        return { user: teacher, error: null };
      }
    }

    // Fallback Mock Register
    const mockTeacher: Teacher = {
      id: 'teacher-' + Date.now(),
      name,
      email,
    };
    localStorage.setItem(MOCK_TEACHER_KEY, JSON.stringify(mockTeacher));
    return { user: mockTeacher, error: null };
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(MOCK_TEACHER_KEY);
  },

  async getCurrentUser(): Promise<Teacher | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (teacherData) return teacherData;
        return {
          id: session.user.id,
          name: session.user.user_metadata?.name || 'المعلم',
          email: session.user.email || '',
        };
      }
    }

    // Check Mock storage
    const stored = localStorage.getItem(MOCK_TEACHER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }

    return null;
  }
};
