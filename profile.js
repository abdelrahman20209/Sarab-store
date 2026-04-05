// 1. استيراد كل شيء من مصدر واحد (ملفك الخاص) لمنع التكرار
import { auth, db, onAuthStateChanged, signOut } from "../firebase-config.js"; 

// 2. استيراد وظائف Firestore فقط من جوجل
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// متغير لحفظ الـ UID للاستخدام العام في الملف
let currentUserUID = null;

// 3. مراقبة حالة المستخدم وتحديث البيانات تلقائياً
onAuthStateChanged(auth, async (user) => {
    const overlay = document.getElementById('panelOverlay');
    const sidebar = document.getElementById('sidebar');
    const profilePanel = document.getElementById('profilePanel');

    if (user) {
        currentUserUID = user.uid;
        console.log("✅ Welcome Founder:", user.uid);
        
        try {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // تحديث الحقول لو موجودة في الصفحة
                const fields = {
                    'displayFullName': userData.fullName || userData.name || "",
                    'displayPhone': userData.phone || "",
                    'displayAddress': userData.address || ""
                };

                for (const [id, value] of Object.entries(fields)) {
                    const el = document.getElementById(id);
                    if (el) el.value = value;
                }
            }
        } catch (error) {
            console.error("❌ Error fetching user data:", error.message);
        }
    } else {
        console.log("👤 زائر مجهول");
        // ممكن توجهه لصفحة اللوجن لو الملف ده خاص بالبروفايل فقط
    }
});

// --- وظائف الواجهة (UI Functions) ---

// 1. فتح القائمة الجانبية (Sidebar)
document.getElementById('menuOpen')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.add('active');
    document.getElementById('panelOverlay')?.classList.add('active');
});

// 2. فتح لوحة الحساب (My Account)
document.getElementById('myAccountBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('profilePanel')?.classList.add('active');
    document.getElementById('panelOverlay')?.classList.add('active');
});

// 3. تفعيل وضع التعديل (أيقونة القلم)
document.getElementById('editProfileBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const ids = ['displayFullName', 'displayPhone', 'displayAddress'];
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.removeAttribute('readonly');
            input.style.borderBottom = "2px solid #8e0000";
            input.style.background = "rgba(142, 0, 0, 0.05)";
        }
    });
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) saveBtn.style.display = "block";
});

// 4. حفظ التعديلات
document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    if (!currentUserUID) return;

    try {
        const userRef = doc(db, "users", currentUserUID);
        await updateDoc(userRef, {
            fullName: document.getElementById('displayFullName').value,
            phone: document.getElementById('displayPhone').value,
            address: document.getElementById('displayAddress').value
        });
        
        alert("تم حفظ البيانات بنجاح! ✨");
        window.location.reload(); // لإعادة وضع القراءة
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الحفظ!");
    }
});

// 5. تسجيل الخروج
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.reload();
    });
});

// 6. إغلاق الكل عند الضغط على الـ Overlay
document.getElementById('panelOverlay')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('profilePanel')?.classList.remove('active');
    document.getElementById('panelOverlay')?.classList.remove('active');
});