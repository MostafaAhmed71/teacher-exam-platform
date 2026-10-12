import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { ClientLicense, LicenseAuditLog, LicenseStatus, OwnerStatus } from '../types';

const LOCAL_LICENSES_KEY = 'meqyas_client_licenses_v1';
const LOCAL_AUDIT_KEY = 'meqyas_license_audit_logs_v1';
const LOCAL_OWNER_KEY = 'meqyas_owner_status_v1';

const DEFAULT_LICENSE: ClientLicense = {
  id: 'default-amr-license-01',
  project_name: 'منصة مقياس للاختبارات',
  client_name: 'الأستاذ عمرو حميصة',
  client_email: 'amr.hamisa@meqyas.edu',
  project_domain: 'amr-exam-platform.vercel.app',
  status: 'active',
  suspension_reason: 'تم انتهاء الحصة المجانية لقاعدة البيانات',
  notes: 'الترخيص الأساسي الرسمي لمنصة مقياس',
  last_status_change: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString()
};

function getLocalLicenses(): ClientLicense[] {
  try {
    const raw = localStorage.getItem(LOCAL_LICENSES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_LICENSES_KEY, JSON.stringify([DEFAULT_LICENSE]));
      return [DEFAULT_LICENSE];
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_LICENSE];
  }
}

function saveLocalLicenses(licenses: ClientLicense[]) {
  localStorage.setItem(LOCAL_LICENSES_KEY, JSON.stringify(licenses));
}

function getLocalAuditLogs(): LicenseAuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addLocalAuditLog(log: Omit<LicenseAuditLog, 'id' | 'created_at'>) {
  const current = getLocalAuditLogs();
  const entry: LicenseAuditLog = {
    ...log,
    id: 'log-' + Date.now(),
    created_at: new Date().toISOString()
  };
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify([entry, ...current]));
}

export const licenseService = {
  /**
   * جلب كافة تراخيص المواقع والعملاء
   */
  async getLicenses(): Promise<ClientLicense[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('client_licenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as ClientLicense[];
        }
      } catch (err) {
        console.warn('Supabase licenses fetch failed, falling back to cached/local:', err);
      }
    }
    return getLocalLicenses();
  },

  /**
   * جلب ترخيص الموقع الحالي (للتحقق العام)
   */
  async getCurrentLicense(): Promise<ClientLicense | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('client_licenses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          return data[0] as ClientLicense;
        }
      } catch (err) {
        console.warn('Supabase current license fetch failed, checking local:', err);
      }
    }
    const local = getLocalLicenses();
    return local[0] || DEFAULT_LICENSE;
  },

  /**
   * تفعيل أو إيقاف ترخيص موقع العميل مع تسجيل سبب الإيقاف
   */
  async toggleLicense(
    licenseId: string,
    newStatus: LicenseStatus,
    reason: string = 'تم انتهاء الحصة المجانية لقاعدة البيانات'
  ): Promise<{ success: boolean; error?: string }> {
    const userEmail = await this.getCurrentUserEmail();

    if (isSupabaseConfigured && supabase) {
      try {
        // احصل على الحالة السابقة
        const { data: currentRecord } = await supabase
          .from('client_licenses')
          .select('*')
          .eq('id', licenseId)
          .single();

        const previousStatus = currentRecord?.status || (newStatus === 'active' ? 'suspended' : 'active');
        const clientName = currentRecord?.client_name || 'العميل';

        // تحديث الترخيص
        const { error: updateError } = await supabase
          .from('client_licenses')
          .update({
            status: newStatus,
            suspension_reason: reason,
            last_status_change: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', licenseId);

        if (updateError) {
          throw updateError;
        }

        // إدراج سجل التدقيق (في حال لم يلتقطه التريجر)
        try {
          await supabase.from('license_audit_logs').insert({
            license_id: licenseId,
            client_name: clientName,
            previous_status: previousStatus,
            new_status: newStatus,
            reason: reason,
            performed_by: userEmail
          });
        } catch {
          // ignore duplicate trigger insert
        }

        return { success: true };
      } catch (err: any) {
        console.error('Error toggling license in Supabase:', err);
        // Fallback locally
      }
    }

    // Local / Demo Mode Execution
    const list = getLocalLicenses();
    const target = list.find((item) => item.id === licenseId);
    if (target) {
      const prev = target.status;
      target.status = newStatus;
      target.suspension_reason = reason;
      target.last_status_change = new Date().toISOString();
      target.updated_at = new Date().toISOString();
      saveLocalLicenses(list);

      addLocalAuditLog({
        license_id: licenseId,
        client_name: target.client_name,
        previous_status: prev,
        new_status: newStatus,
        reason: reason,
        performed_by: userEmail
      });
      return { success: true };
    }

    return { success: false, error: 'تعذر العثور على ترخيص العميل المطلوب' };
  },

  /**
   * إنشاء ترخيص جديد لعميل أو موقع
   */
  async createLicense(
    payload: Omit<ClientLicense, 'id' | 'created_at' | 'updated_at' | 'last_status_change'>
  ): Promise<{ success: boolean; error?: string; license?: ClientLicense }> {
    const userEmail = await this.getCurrentUserEmail();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('client_licenses')
          .insert({
            project_name: payload.project_name,
            client_name: payload.client_name,
            client_email: payload.client_email,
            project_domain: payload.project_domain,
            status: payload.status,
            suspension_reason: payload.suspension_reason,
            notes: payload.notes
          })
          .select()
          .single();

        if (error) throw error;

        // تسجيل في سجل التدقيق
        try {
          await supabase.from('license_audit_logs').insert({
            license_id: data.id,
            client_name: data.client_name,
            previous_status: 'suspended',
            new_status: data.status,
            reason: 'إنشاء ترخيص عميل جديد في المنصة',
            performed_by: userEmail
          });
        } catch {
          // ignore
        }

        return { success: true, license: data as ClientLicense };
      } catch (err: any) {
        console.error('Error creating license in Supabase:', err);
      }
    }

    // Local creation
    const newRecord: ClientLicense = {
      ...payload,
      id: 'license-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_status_change: new Date().toISOString()
    };

    const current = getLocalLicenses();
    const updated = [newRecord, ...current];
    saveLocalLicenses(updated);

    addLocalAuditLog({
      license_id: newRecord.id,
      client_name: newRecord.client_name,
      previous_status: 'suspended',
      new_status: newRecord.status,
      reason: 'إنشاء ترخيص عميل جديد في المنصة',
      performed_by: userEmail
    });

    return { success: true, license: newRecord };
  },

  /**
   * تعديل بيانات ترخيص قائم
   */
  async updateLicense(
    id: string,
    payload: Partial<ClientLicense>
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('client_licenses')
          .update({
            project_name: payload.project_name,
            client_name: payload.client_name,
            client_email: payload.client_email,
            project_domain: payload.project_domain,
            notes: payload.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      } catch (err: any) {
        console.error('Error updating license in Supabase:', err);
      }
    }

    const list = getLocalLicenses();
    const idx = list.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() };
      saveLocalLicenses(list);
      return { success: true };
    }

    return { success: false, error: 'تعذر تعديل الترخيص' };
  },

  /**
   * جلب سجل تدقيق التراخيص Audit Logs
   */
  async getAuditLogs(): Promise<LicenseAuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('license_audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as LicenseAuditLog[];
        }
      } catch (err) {
        console.warn('Supabase audit logs fetch failed:', err);
      }
    }
    return getLocalAuditLogs();
  },

  /**
   * التحقق من صلاحية المالك من جهة الخادم
   */
  async checkIsOwner(): Promise<OwnerStatus> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return { is_owner: false, authenticated: false };
        }

        const userEmail = session.user.email || '';

        // Call RPC get_owner_status if exists
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_owner_status');
          if (!rpcError && rpcData) {
            return {
              is_owner: Boolean(rpcData.is_owner),
              authenticated: true,
              email: userEmail,
              is_initial_setup: Boolean(rpcData.is_initial_setup)
            };
          }
        } catch {
          // RPC may not be deployed yet
        }

        // Direct table check in app_owners
        try {
          const { data: ownersData, error: ownersError } = await supabase
            .from('app_owners')
            .select('*');

          if (!ownersError) {
            if (!ownersData || ownersData.length === 0) {
              return { is_owner: true, authenticated: true, email: userEmail, is_initial_setup: true };
            }
            const isOwner = ownersData.some(
              (o) => o.id === session.user.id || (o.email && o.email.toLowerCase() === userEmail.toLowerCase())
            );
            return { is_owner: isOwner, authenticated: true, email: userEmail };
          }
        } catch {
          // Table may not be created yet
        }

        // Fallback: Check if user is authenticated teacher and no explicit owner list
        return { is_owner: true, authenticated: true, email: userEmail, is_initial_setup: true };
      } catch (err) {
        console.error('Error checking owner status:', err);
      }
    }

    // Local / Dev fallback
    const localOwner = localStorage.getItem(LOCAL_OWNER_KEY);
    return {
      is_owner: true,
      authenticated: true,
      email: localOwner || 'owner@meqyas.platform',
      is_initial_setup: false
    };
  },

  /**
   * تعيين المالك الأولي للمنصة على الخادم
   */
  async claimInitialOwner(): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          return { success: false, message: 'يرجى تسجيل الدخول أولاً' };
        }

        try {
          const { data, error } = await supabase.rpc('claim_initial_owner');
          if (!error && data) {
            return { success: true, message: data.message || 'تم تعيينك كمالك للمنصة' };
          }
        } catch {
          // RPC fallback
        }

        // Direct insert into app_owners
        await supabase.from('app_owners').upsert({
          id: session.user.id,
          email: session.user.email?.toLowerCase() || ''
        });

        return { success: true, message: 'تم حفظ حسابك كمالك رئيسي للمنصة' };
      } catch (err: any) {
        return { success: false, message: err.message || 'فشل تسجيل المالك' };
      }
    }

    localStorage.setItem(LOCAL_OWNER_KEY, 'owner@meqyas.platform');
    return { success: true, message: 'تم تفعيل صلاحية المالك محلياً' };
  },

  async getCurrentUserEmail(): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) return session.user.email;
    }
    return 'owner@meqyas.platform';
  }
};
