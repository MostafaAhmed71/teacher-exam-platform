import { supabase } from './supabaseClient';

export interface AccessCode {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
}

function client() {
  if (!supabase) throw new Error('إدارة أكواد التفعيل تتطلب إعداد اتصال Supabase');
  return supabase;
}

export const accessCodeService = {
  async list(testId: string): Promise<AccessCode[]> {
    const { data, error } = await client().from('test_access_codes')
      .select('id,code,max_uses,used_count').eq('test_id', testId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async create(testId: string, maxUses: number): Promise<AccessCode> {
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 1000000) {
      throw new Error('عدد الاستخدامات يجب أن يكون عددًا صحيحًا بين 1 و1000000');
    }
    const { data, error } = await client().from('test_access_codes')
      .insert({ test_id: testId, max_uses: maxUses }).select('id,code,max_uses,used_count').single();
    if (error) throw new Error(error.message);
    return data;
  },
  async revoke(id: string): Promise<void> {
    const { data, error } = await client().from('test_access_codes').delete().eq('id', id).select('id');
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('تعذر إلغاء الكود');
  },
};
