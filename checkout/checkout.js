import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
    authDomain: "sarab-store.firebaseapp.com",
    projectId: "sarab-store",
    storageBucket: "sarab-store.firebasestorage.app",
    messagingSenderId: "629583443040",
    appId: "1:629583443040:web:150fcc4d517fc8f82fbf05",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

let currentOrderData = null; 

/* --- 1. دالة توليد الرقم المرجعي --- */
function generateReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SRB-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/* --- 2. دالة تحميل الريسيت وعرض البيانات --- */
async function loadReceipt() {
    const itemsListContainer = document.getElementById('orderItemsList');
    const finalTotalDisplay = document.getElementById('finalTotal');
    const refDisplay = document.getElementById('refNumber');
    const dateDisplay = document.getElementById('orderDate');

    if (!itemsListContainer) return;

    // عرض التاريخ والرقم المرجعي
    const now = new Date();
    dateDisplay.innerText = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const ref = generateReference();
    if(refDisplay) refDisplay.innerText = `#${ref}`;

    // جلب بيانات الشحن من الـ LocalStorage (اللي اتحفظت من صفحة السلة)
    const shippingInfo = JSON.parse(localStorage.getItem('temp_shipping_info'));
    if (!shippingInfo) {
        alert("بيانات الشحن مفقودة! سيتم إعادتك لتأكيد البيانات.");
        window.location.href = "car.html";
        return;
    }

    // جلب المنتجات
    let cartItems = [];
    const user = auth.currentUser;
    if (user) {
        const cartSnap = await getDoc(doc(db, "carts", user.uid));
        if (cartSnap.exists()) cartItems = cartSnap.data().items || [];
    } else {
        cartItems = JSON.parse(localStorage.getItem('sarab_guest_cart')) || [];
    }

    if (cartItems.length === 0) {
        window.location.href = "../index.html";
        return;
    }

    // بناء القائمة وحساب الحساب
    itemsListContainer.innerHTML = "";
    let total = 0;
    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemsListContainer.innerHTML += `
            <div class="order-item" style="display:flex; justify-content:space-between; margin-bottom:10px; color:#fff;">
                <span>${item.name} (x${item.quantity})</span>
                <span>${itemTotal} ج.م</span>
            </div>
        `;
    });

    const finalTotal = total + 50; // إضافة مصاريف الشحن الثابتة
    if(finalTotalDisplay) finalTotalDisplay.innerText = `${finalTotal} ج.م`;

    // تجهيز الداتا النهائية للإرسال
    currentOrderData = {
        items: cartItems,
        totalAmount: finalTotal,
        referenceCode: ref,
        customerInfo: shippingInfo, // الاسم والعنوان والتليفون من صفحة السلة
        status: 'pending_payment',
        createdAt: serverTimestamp(),
        userId: user ? user.uid : 'guest'
    };
}

/* --- 3. إرسال الطلب النهائي للأدمن --- */
window.completeOrder = async () => {
    const btn = document.getElementById('completeOrderBtn');
    if (!currentOrderData) return;

    try {
        btn.disabled = true;
        btn.innerText = "جاري الحفظ... ⏳";

        // حفظ في كوليكشن orders
        await addDoc(collection(db, "orders"), currentOrderData);

        // مسح السلة والبيانات المؤقتة
        if (auth.currentUser) {
            await setDoc(doc(db, "carts", auth.currentUser.uid), { items: [] });
        } else {
            localStorage.removeItem('sarab_guest_cart');
        }
        localStorage.removeItem('temp_shipping_info');

        alert("تم استلام طلبك بنجاح! ✅\nبرجاء إرسال صورة التحويل على الواتساب مع كود الطلب: " + currentOrderData.referenceCode);
        window.location.href = "../index.html";

    } catch (error) {
        console.error("Error:", error);
        alert("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
        btn.disabled = false;
        btn.innerText = "تأكيد الطلب";
    }
};

// ربط الزرار
document.getElementById('completeOrderBtn')?.addEventListener('click', window.completeOrder);

// التشغيل
onAuthStateChanged(auth, () => {
    loadReceipt();
});
