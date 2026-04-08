import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
    authDomain: "sarab-store.firebaseapp.com",
    projectId: "sarab-store",
    storageBucket: "sarab-store.firebasestorage.app",
    messagingSenderId: "629583443040",
    appId: "1:629583443040:web:150fcc4d517fc8f82fbf05"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserUID = null;
let cartItems = [];

// --- 1. وظيفة التحقق (الـ Validation الذكي) ---
async function validateAndCleanCart(rawItems) {
    try {
        const productsSnap = await getDocs(collection(db, "products"));
        const activeProductIds = productsSnap.docs.map(doc => doc.id);
        const cleanItems = rawItems.filter(item => activeProductIds.includes(item.id));
        return cleanItems;
    } catch (e) {
        console.error("خطأ أثناء التحقق من المنتجات:", e);
        return rawItems;
    }
}

// 2. مراقبة حالة المستخدم
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUID = user.uid;
        await loadShippingData(); 
        await loadCartData();      
    } else {
        currentUserUID = null;
        await loadGuestCartData(); 
    }
});

async function loadGuestCartData() {
    const guestData = JSON.parse(localStorage.getItem('sarab_guest_cart')) || [];
    cartItems = await validateAndCleanCart(guestData);
    localStorage.setItem('sarab_guest_cart', JSON.stringify(cartItems));
    renderCartUI(cartItems);
}

async function loadCartData() {
    const cartRef = doc(db, "carts", currentUserUID);
    const cartSnap = await getDoc(cartRef);
    const rawItems = cartSnap.exists() ? cartSnap.data().items || [] : [];
    cartItems = await validateAndCleanCart(rawItems);
    await setDoc(cartRef, { items: cartItems }, { merge: true });
    renderCartUI(cartItems);
}

// 3. وظيفة العرض (UI Rendering)
function renderCartUI(items) {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cartCount');
    if (!container) return;

    if (badge) badge.innerText = items.reduce((acc, item) => acc + item.quantity, 0);

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:#888;">
                <i class="fas fa-shopping-bag" style="font-size:3rem; margin-bottom:20px; color:#e30613;"></i>
                <p style="font-size:1.2rem;">سلتك خالية من المقتنيات..</p>
                <a href="../index.html" style="display:inline-block; margin-top:20px; color:#fff; text-decoration:underline;">العودة للمتجر</a>
            </div>
        `;
        updateSummary(0);
        return;
    }

    container.innerHTML = "";
    let subtotal = 0;
    items.forEach((item, index) => {
        subtotal += (item.price * item.quantity);
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:5px;">
                <div style="flex:1">
                    <h4 style="margin:0; color:#fff; font-size:0.9rem;">${item.name}</h4>
                    <p style="margin:5px 0; color:#e30613; font-weight:bold;">${item.price} ج.م</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button onclick="updateQty(${index}, -1)" style="background:#333; color:#fff; border:none; width:25px; cursor:pointer;">-</button>
                    <span style="color:#fff;">${item.quantity}</span>
                    <button onclick="updateQty(${index}, 1)" style="background:#333; color:#fff; border:none; width:25px; cursor:pointer;">+</button>
                    <i class="fas fa-trash" onclick="removeItem(${index})" style="color:#666; cursor:pointer; margin-left:10px;"></i>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    updateSummary(subtotal);
}

window.updateQty = async (index, change) => {
    const newQty = cartItems[index].quantity + change;
    if (newQty < 1) return;
    cartItems[index].quantity = newQty;
    saveCartChanges();
};

window.removeItem = async (index) => {
    if (!confirm("هل تريد إزالة هذا المنتج؟")) return;
    cartItems.splice(index, 1);
    saveCartChanges();
};

async function saveCartChanges() {
    if (currentUserUID) {
        await updateDoc(doc(db, "carts", currentUserUID), { items: cartItems });
        loadCartData();
    } else {
        localStorage.setItem('sarab_guest_cart', JSON.stringify(cartItems));
        loadGuestCartData();
    }
}

// 4. تحميل بيانات الشحن تلقائياً للمسجلين
async function loadShippingData() {
    try {
        const userDoc = await getDoc(doc(db, "users", currentUserUID));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if(document.getElementById('cart-name')) document.getElementById('cart-name').value = data.fullName || "";
            if(document.getElementById('cart-phone')) document.getElementById('cart-phone').value = data.phone || "";
            if(document.getElementById('cart-address')) document.getElementById('cart-address').value = data.address || "";
        }
    } catch (e) { console.error(e); }
}

function updateSummary(subtotal) {
    const pureSubtotal = Number(subtotal) || 0;
    const shipping = pureSubtotal > 0 ? 50 : 0;
    const final = pureSubtotal + shipping;
    if (document.getElementById('subtotal')) document.getElementById('subtotal').innerText = `${pureSubtotal} ج.م`;
    if (document.getElementById('shipping-fee')) document.getElementById('shipping-fee').innerText = `${shipping} ج.م`;
    if (document.getElementById('final-total')) document.getElementById('final-total').innerText = `${final} ج.م`;
}

// --- 5. تأكيد الطلب والتحويل لصفحة الدفع (الربط النهائي) ---
document.getElementById('confirmOrderBtn')?.addEventListener('click', async () => {
    if (cartItems.length === 0) return alert("السلة فارغة!");

    const nameInput = document.getElementById('cart-name');
    const phoneInput = document.getElementById('cart-phone');
    const addressInput = document.getElementById('cart-address');

    const name = nameInput ? nameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";

    if (!name || !phone || !address) {
        return alert("برجاء ملء بيانات الشحن بالكامل (الاسم، الهاتف، العنوان) للمتابعة.");
    }

    // 1. حفظ بيانات الشحن في الـ LocalStorage عشان الـ Receipt يشوفها
    const shippingInfo = { 
        name: name, 
        phone: phone, 
        address: address 
    };
    localStorage.setItem('temp_shipping_info', JSON.stringify(shippingInfo));

    // 2. التحقق النهائي من توفر المنتجات في الـ Firestore
    const verifiedItems = await validateAndCleanCart(cartItems);
    if (verifiedItems.length === 0) {
        return alert("عذراً، بعض المنتجات في سلتك لم تعد متوفرة.");
    }

    // 3. التوجيه الفوري لصفحة الريسيت والدفع باستخدام المسار المطلق الشغال
    window.location.href = "/checkout/checkout.html";
});