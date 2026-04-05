import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. إعدادات سراب (منع تكرار التشغيل)
const firebaseConfig = {
    apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
    authDomain: "sarab-store.firebaseapp.com",
    projectId: "sarab-store",
    storageBucket: "sarab-store.firebasestorage.app",
    messagingSenderId: "629583443040",
    appId: "1:629583443040:web:150fcc4d517fc8f82fbf05",
    measurementId: "G-484LH189EW",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// 2. العناصر الأساسية (تأكد من وجودها بمرونة)
const getEl = (id) => document.getElementById(id);

// 3. مراقبة حالة المستخدم وتحديث الواجهة
// 3. مراقبة حالة المستخدم وتحديث الواجهة (النسخة المعتمدة لـ Qovox)
onAuthStateChanged(auth, async (user) => {
    const authArea = getEl("auth-area");
    const sidebarFooter = getEl("sidebarFooter"); // تأكد إن الـ ID ده موجود في الـ HTML بتاع الـ Sidebar
    const cartCount = getEl("cartCount");

    // تنظيف أولي لمنع أي تكرار
    if (authArea) authArea.innerHTML = "";
    if (sidebarFooter) {
        sidebarFooter.innerHTML = "";
        sidebarFooter.style.display = "none";
    }

    if (user) {
        console.log("✅ Welcome Founder:", user.email);

        // أ- تحديث الهيدر: إظهار "حسابي" فقط
        if (authArea) {
            authArea.innerHTML = `
                <a href="#" id="openProfile" class="user-link" style="color: #fff; text-decoration: none; display: flex; align-items: center; gap: 5px; font-weight: bold; font-size: 0.9rem;">
                    <i class="far fa-user"></i> <span>حسابي</span>
                </a>
            `;
            getEl("openProfile")?.addEventListener("click", (e) => {
                e.preventDefault();
                toggleProfileSheet(true);
            });
        }

        // ب- تحديث الـ Sidebar: إظهار زر "تسجيل الخروج" في الأسفل
        if (sidebarFooter) {
            sidebarFooter.style.display = "block";
            sidebarFooter.innerHTML = `
                <button id="logoutBtnSide" style="width: 100%; padding: 12px; background: rgba(227, 6, 19, 0.1); color: #ff4d4d; border: 1px solid rgba(227, 6, 19, 0.2); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </button>
            `;
            getEl("logoutBtnSide")?.addEventListener("click", () => 
                signOut(auth).then(() => window.location.reload())
            );
        }
        
        // ج- تحديث عداد السلة
        const cartSnap = await getDoc(doc(db, "carts", user.uid));
        if (cartSnap.exists() && cartCount) {
            const count = (cartSnap.data().items || []).reduce((s, i) => s + i.quantity, 0);
            cartCount.innerText = count;
        }

    } else {
        console.log("👤 زائر مجهول");
        // حالة الزائر: إظهار زر "دخول" فقط
        if (authArea) {
            authArea.innerHTML = `<a href="login/login.html" class="login-link" style="color: #fff; text-decoration: none;"><i class="fas fa-sign-in-alt"></i> تسجيل الدخول</a>`;
        }
        if (cartCount) cartCount.innerText = "0";
        if (sidebarFooter) sidebarFooter.style.display = "none";
    }
});

// 4. وظائف الـ Profile Sheet والقائمة الجانبية
function toggleProfileSheet(show) {
    const profileSheet = getEl("profileSheet") || getEl("profilePanel");
    const panelOverlay = getEl("panelOverlay");

    if (!profileSheet) {
        console.warn("⚠️ تنبيه: لوحة الملف الشخصي غير موجودة.");
        return;
    }

    if (show) {
        profileSheet.classList.add("active");
        if (panelOverlay) {
            panelOverlay.classList.add("active");
            panelOverlay.style.display = "block";
        }
        loadUserData();
    } else {
        profileSheet.classList.remove("active");
        if (panelOverlay) {
            panelOverlay.classList.remove("active");
            panelOverlay.style.display = "none";
        }
        resetEditMode();
    }
}

// تشغيل القائمة الجانبية (Sidebar)
getEl("menuOpen")?.addEventListener("click", () => {
    const sidebar = getEl("sidebar");
    const overlay = getEl("panelOverlay");
    if (sidebar) sidebar.classList.add("active");
    if (overlay) {
        overlay.classList.add("active");
        overlay.style.display = "block";
    }
});

// إغلاق كل شيء (بروفايل أو منيو) عند الضغط على الـ Overlay أو أزرار الإغلاق
[getEl("closeSheet"), getEl("closeProfile"), getEl("panelOverlay"), getEl("closeMenu")].forEach(btn => {
    if (btn) btn.onclick = () => {
        toggleProfileSheet(false);
        getEl("sidebar")?.classList.remove("active");
    };
});

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (getEl("displayFullName")) getEl("displayFullName").value = data.fullName || data.name || "";
            if (getEl("displayPhone")) getEl("displayPhone").value = data.phone || "";
            if (getEl("displayAddress")) getEl("displayAddress").value = data.address || "";
            
            const emailInput = getEl("displayEmail");
            if (emailInput) emailInput.value = user.email;
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// 5. التعديل والحفظ (زرار القلم)
getEl("editProfileBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    const profileInputs = document.querySelectorAll("#displayFullName, #displayPhone, #displayAddress");
    profileInputs.forEach((input) => {
        input.removeAttribute("readonly");
        input.style.borderBottom = "2px solid #800000";
        input.style.background = "rgba(128, 0, 0, 0.05)";
    });
    const saveBtn = getEl("saveProfileBtn");
    if (saveBtn) saveBtn.style.display = "block";
    console.log("📝 وضع التعديل نشط");
});

getEl("saveProfileBtn")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const saveBtn = getEl("saveProfileBtn");
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "جاري الحفظ...";
    
    try {
        await updateDoc(doc(db, "users", user.uid), {
            fullName: getEl("displayFullName")?.value || "",
            phone: getEl("displayPhone")?.value || "",
            address: getEl("displayAddress")?.value || "",
        });
        alert("تم تحديث مقتنيات بياناتك بنجاح! ✨");
        resetEditMode();
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحفظ!");
    } finally {
        saveBtn.innerText = originalText;
    }
});

function resetEditMode() {
    const profileInputs = document.querySelectorAll("#displayFullName, #displayPhone, #displayAddress");
    profileInputs.forEach((input) => {
        input.setAttribute("readonly", true);
        input.style.borderBottom = "none";
        input.style.background = "transparent";
    });
    const saveBtn = getEl("saveProfileBtn");
    if (saveBtn) saveBtn.style.display = "none";
}
// --- تشغيل الـ Sidebar الخاص بـ Founder Qovox ---
const sidebar = document.getElementById('sidebar');
const menuOpen = document.getElementById('menuOpen'); // تأكد إن زرار الهيدر واخد ID ده
const menuClose = document.getElementById('menuClose');
const overlay = document.getElementById('overlay');

// وظيفة الفتح
menuOpen?.addEventListener('click', () => {
    sidebar?.classList.add('active');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden'; // يمنع السكرول والشاشة مفتوحة
});

// وظيفة القفل (من زرار X أو من الـ Overlay)
const closeSidebar = () => {
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = 'auto'; // يرجع السكرول
};

menuClose?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);