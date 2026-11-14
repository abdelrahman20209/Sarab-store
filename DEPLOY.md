# نشر وتشغيل موقع سراب

- الموقع ولوحة الأدمن: https://sarab-3tor.web.app  (الأدمن: `/admin.html`)
- قاعدة البيانات وتسجيل الدخول: Firebase مشروع `sarab-3tor`
- سيرفر الإيميلات (كود التفعيل OTP + الرسائل الترويجية): Cloudflare Worker `sarab-api`

## أوامر النشر (من فولدر المشروع)

| الأمر | بيعمل إيه |
|---|---|
| `deploy.bat` | يبني `dist` وينشر الموقع على `sarab-3tor.web.app` |
| `deploy.bat rules` | ينشر قواعد Firestore |
| `deploy.bat api` | ينشر سيرفر الإيميلات |
| `deploy.bat key` | يحفظ مفتاح Brevo على السيرفر (بتلصقه في النافذة) |
| `deploy.bat all` | الموقع + القواعد + السيرفر |
| `deploy.bat build` | يبني `dist` فقط بدون نشر |

أول مرة فقط: `npx firebase-tools@latest login` و `npx wrangler login`.

## إعداد أول مرة

1. `deploy.bat key` والصق مفتاح Brevo (المفتاح لا يُكتب في أي ملف).
2. في Brevo: فعّل إيميل مُرسِل (Senders) — السيرفر يستخدم أول مُرسِل مفعّل.
3. `deploy.bat all`
4. من لوحة الأدمن: أضف مناطق الشحن، وسائل التحويل، الأقسام، والمنتجات.

## الأدمن

حساب الأدمن = حساب في Firebase Authentication له مستند `admins/{UID}` في Firestore.
`create-admin.bat` ينشئ الحساب ويطبع الـ UID.

## مكان كل حاجة

- `js/config.js` — إعدادات Firebase ورابط سيرفر الإيميلات (مكان واحد لكل الصفحات).
- `site-schema.js` — كل النصوص والصور القابلة للتعديل من الأدمن + نص الشروط الافتراضي.
- `js/layout.js` — الهيدر والفوتر (نسخة واحدة لكل الصفحات).
- `worker/` — سيرفر الإيميلات.
