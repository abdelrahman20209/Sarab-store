import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. إعدادات سراب
const firebaseConfig = {
    apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
    authDomain: "sarab-store.firebaseapp.com",
    projectId: "sarab-store",
    storageBucket: "sarab-store.firebasestorage.app",
    messagingSenderId: "629583443040",
    appId: "1:629583443040:web:150fcc4d517fc8f82fbf05",
    measurementId: "G-484LH189EW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signUpBtn = document.getElementById('signUpBtn');

if (signUpBtn) {
    signUpBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // سحب البيانات
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const phone = document.getElementById('backupPhone').value.trim();
        const address = document.getElementById('address').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgree = document.getElementById('termsAgree').checked;

        // التحققات الأساسية
        if (!fullName || !email || !password || !phone || !address) {
            alert("يرجى ملء كافة الخانات الملكية!");
            return;
        }

        if (password.length < 6) {
            alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
            return;
        }

        if (password !== confirmPassword) {
            alert("كلمتا المرور غير متطابقتين!");
            return;
        }

        if (!termsAgree) {
            alert("يرجى الموافقة على الشروط والأحكام الخاصة بسراب.");
            return;
        }

        // قفل الزرار وبدء التحميل
        signUpBtn.disabled = true;
        signUpBtn.innerText = "جاري إنشاء حسابك...";
        console.log("🚀 بدأت عملية التسجيل...");

        try {
            // 2. إنشاء الحساب (Auth)
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("✅ تم إنشاء الحساب بـ UID:", user.uid);

            // 3. حفظ البيانات (Firestore)
            console.log("⏳ جاري حفظ البيانات في الخزنة...");
            await setDoc(doc(db, "users", user.uid), {
                name: fullName,
                email: email,
                phone: phone,
                address: address,
                createdAt: new Date(),
                uid: user.uid
            });
            
            console.log("✨ تم الحفظ بنجاح!");
            alert("تم إنشاء حسابك وحفظ بياناتك في سراب بنجاح!");
            
            // التحويل للرئيسية
            window.location.href = "../index.html";

        } catch (error) {
            signUpBtn.disabled = false;
            signUpBtn.innerText = "انضم إلينا الآن";
            
            console.error("❌ حدث خطأ:", error.code, error.message);

            switch (error.code) {
                case 'auth/email-already-in-use':
                    alert("هذا البريد الإلكتروني مسجل لدينا بالفعل.");
                    break;
                case 'auth/invalid-email':
                    alert("صيغة البريد الإلكتروني غير صحيحة.");
                    break;
                case 'auth/network-request-failed':
                    alert("فشل الاتصال بالسيرفر، تأكد من الإنترنت.");
                    break;
                default:
                    alert("حدث خطأ تقني: " + error.message);
            }
        }
    });
}