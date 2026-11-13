# رفع وتشغيل موقع سراب

## 1) الرفع على GitHub
    git push -u origin claude/dora-project-72a7uu

## 2) النشر على Firebase Hosting
    npm install -g firebase-tools
    firebase login
    firebase use sarab-3tor
    firebase deploy --only hosting

## 3) إعداد الأدمن (قبل نشر القواعد)
1. افتح الموقع /admin.html وسجّل دخول بحسابك. لو ظهرت "الدخول غير مصرّح" انسخ الـ UID.
2. في Firebase Console > Firestore > أنشئ collection باسم `admins` و document ID = الـ UID (أي حقل داخله، مثلاً role = admin).
3. ضع إيميلك أيضاً في admin-config.js داخل ADMIN_EMAILS.

## 4) نشر قواعد Firestore (بعد تجربة الأدمن)
راجع firestore.rules ثم:
    firebase deploy --only firestore:rules
