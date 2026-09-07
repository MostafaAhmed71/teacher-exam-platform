# منصة الاختبارات للمعلمين (Teacher Exam Platform) 🎓

نظام إلكتروني شامل واحترافي لإنشاء وإدارة الاختبارات وإتاحتها للطلاب مع تصحيح تلقائي، تحليلات أداء، ومنع إعادة الاختبار، مصمم باللغة العربية بنظام **RTL**.

---

## 🚀 التقنيات المستخدمة
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (دعم RTL الكامل وخط Tajawal)
- **Supabase** (قاعدة البيانات، RLS Security، ودوال التصحيح التلقائي RPC)
- **React Router v6**
- **Lucide Icons**

---

## ⚡ خطوت الربط والنشر

### 1. إعداد متغيرات البيئة (`.env`)
قم بإنشاء ملف `.env` في مجلد المشروع الرئيسي وأضف المفاتيح الخاصة بمشروع Supabase:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. إعداد قاعدة البيانات في Supabase
1. افتح **SQL Editor** في لوحة تحكم مشروعك في Supabase.
2. انسخ محتوى الملف [`supabase/schema.sql`](./supabase/schema.sql) وألصقه في المحرر.
3. اضغط **Run** لإنشاء الجداول والقواعد والأمان ودوال التصحيح تلقائياً.

### 3. رفع المشروع إلى GitHub
قم بتشغيل الأوامر التالية في المجلد لتحديد المستودع والرفع:
```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

---

## 🛠️ التشغيل المحلي
```bash
# تثبيت الحزم
npm install

# تشغيل خادم التطوير
npm run dev

# بناء المشروع للإنتاج
npm run build
```
