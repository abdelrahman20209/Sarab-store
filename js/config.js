// =====================================================================
//  إعدادات الموقع — مكان واحد فقط (كل الصفحات ولوحة التحكم تقرأ من هنا)
// =====================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyAi3ae1vCSip7C7VTBOSdyyTDMbhD_pZuw",
  authDomain: "sarab-3tor.firebaseapp.com",
  projectId: "sarab-3tor",
  storageBucket: "sarab-3tor.firebasestorage.app",
  messagingSenderId: "132817463996",
  appId: "1:132817463996:web:6d63c584d1342b2598feb9",
  measurementId: "G-YFDD0JKDFL",
};

// رابط سيرفر الإيميلات (Cloudflare Worker): كود التفعيل OTP + الرسائل الترويجية.
// المفتاح السري لـ Brevo محفوظ داخل السيرفر فقط وليس هنا.
export const API_URL = "https://sarab-api.qovox222.workers.dev";
