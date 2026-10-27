import { useEffect, useState } from 'react';
import { accessCodeService, type AccessCode } from '../services/accessCodeService';
import { copyToClipboard } from '../utils/helpers';
import { useToast } from './Toast';

export function TestAccessCodes({ testId }: { testId: string }) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [maxUses, setMaxUses] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    accessCodeService.list(testId).then(data => { if (!cancelled) setCodes(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [testId]);

  async function create() {
    setBusy(true);
    setError('');
    try {
      const code = await accessCodeService.create(testId, maxUses);
      setCodes(prev => [code, ...prev]);
      showToast('تم إنشاء كود التفعيل', 'success');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء الكود'); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError('');
    try {
      await accessCodeService.revoke(id);
      setCodes(prev => prev.filter(code => code.id !== id));
      showToast('تم إلغاء الكود والجلسات المرتبطة به', 'success');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إلغاء الكود'); }
    finally { setBusy(false); }
  }

  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4" aria-label="أكواد تفعيل الاختبار">
      <h2 className="text-lg font-bold text-navy-900">أكواد تفعيل الاختبار</h2>
      <p className="text-sm text-slate-600">أرسل للطالب رابط الاختبار والكود. كل بدء جديد يستهلك استخدامًا؛ كود بعدد 3 يسمح بثلاث محاولات إجمالًا.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">عدد مرات استخدام الكود
          <input type="number" min={1} max={1000000} step={1} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))}
            className="block mt-1 border rounded-xl p-2 w-40" />
        </label>
        <button type="button" disabled={busy} onClick={create} className="bg-navy-900 text-white rounded-xl p-3 disabled:opacity-50">إنشاء كود جديد</button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {codes.length === 0 && !error && <p className="text-sm text-slate-500">أنشئ كودًا للسماح للطلاب بدخول الاختبار.</p>}
      <ul className="space-y-3">
        {codes.map(code => <li key={code.id} className="border rounded-xl p-3 flex flex-wrap items-center gap-3">
          <code dir="ltr" className="break-all text-sm">{code.code}</code>
          <span className="text-sm">المستخدم: {code.used_count} / {code.max_uses} — المتبقي: {Math.max(0, code.max_uses - code.used_count)}</span>
          <button type="button" onClick={async () => showToast(await copyToClipboard(code.code) ? 'تم نسخ الكود' : 'تعذر نسخ الكود', 'info')} className="text-sm underline">نسخ الكود</button>
          <button type="button" disabled={busy} onClick={() => revoke(code.id)} className="text-sm text-rose-700 underline disabled:opacity-50">إلغاء الكود وجلساته</button>
        </li>)}
      </ul>
      <button type="button" disabled={busy} className="text-sm underline" onClick={async () => {
        setBusy(true);
        try { setCodes(await accessCodeService.list(testId)); setError(''); }
        catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث العدادات'); }
        finally { setBusy(false); }
      }}>تحديث عدد الاستخدامات</button>
    </section>
  );
}
