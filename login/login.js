// 1. استيراد الدوال الأساسية فقط
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. بيانات مشروع سراب (نفس بياناتك)
const firebaseConfig = {
  apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
  authDomain: "sarab-store.firebaseapp.com",
  projectId: "sarab-store",
  storageBucket: "sarab-store.firebasestorage.app",
  messagingSenderId: "629583443040",
  appId: "1:629583443040:web:150fcc4d517fc8f82fbf05"
};

// 3. تشغيل Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 4. برمجة زرار تسجيل الدخول
const loginBtn = document.getElementById('loginBtn');

if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("أهلاً بك في سراب!");
                window.location.href = "../index.html"; 
            })
            .catch((error) => {
                alert("خطأ: " + error.message);
            });
    });
} else {
    console.error("لم يتم العثور على زرار بالـ ID: loginBtn");
}