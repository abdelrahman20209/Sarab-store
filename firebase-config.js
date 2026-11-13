import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAi3ae1vCSip7C7VTBOSdyyTDMbhD_pZuw",
    authDomain: "sarab-3tor.firebaseapp.com",
    projectId: "sarab-3tor",
    storageBucket: "sarab-3tor.firebasestorage.app",
    messagingSenderId: "132817463996",
    appId: "1:132817463996:web:6d63c584d1342b2598feb9"
};

// تشغيل Firebase بدون تكرار
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// تصدير كل الأدوات اللي هتحتاجها في أي ملف تاني
export { db, auth, onAuthStateChanged, signOut };