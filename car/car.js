import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// 1. مراقبة حالة المستخدم (مُعدلة لدعم الزوار)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUID = user.uid;
        console.log("🛒 سلة مستخدم مسجل");
        await loadShippingData(); 
        await loadCartData();      
    } else {
        currentUserUID = null;
        console.log("🛒 سلة زائر");
        loadGuestCartData(); // تحميل سلة الزائر بدلاً من طرده
    }
});

// 2. تحميل بيانات الزائر من الـ LocalStorage
function loadGuestCartData() {
    const guestData = JSON.parse(localStorage.getItem('sarab_guest_cart')) || [];
    cartItems = guestData;
    renderCartUI(cartItems);
}

// 3. سحب معلومات الشحن للمسجلين
async function loadShippingData() {
    try {
        const userDoc = await getDoc(doc(db, "users", currentUserUID));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const fields = {
                'cart-name': data.fullName || "",
                'cart-phone': data.phone || "",
                'cart-address': data.address || "",
                'displayFullName': data.fullName || "",
                'displayPhone': data.phone || "",
                'displayAddress': data.address || ""
            };
            for (const [id, val] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) el.value = val;
            }
        }
    } catch (e) { console.error("Error loading shipping data:", e); }
}

// 4. تحميل سلة المسجل من Firestore
async function loadCartData() {
    const cartRef = doc(db, "carts", currentUserUID);
    const cartSnap = await getDoc(cartRef);
    cartItems = cartSnap.exists() ? cartSnap.data().items || [] : [];
    renderCartUI(cartItems);
}

// 5. وظيفة العرض الموحدة (UI Rendering)
function renderCartUI(items) {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; color:#888;">
                <i class="fas fa-shopping-bag" style="font-size:3rem; margin-bottom:20px; color:#e30613;"></i>
                <p style="font-size:1.2rem;">سلتك خالية من المقتنيات..</p>
                <a href="../index.html" style="display:inline-block; margin-top:20px; color:#fff; text-decoration:underline;">العودة للمتجر لاقتناء العطور</a>
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
        itemDiv.className = 'cart-item-row'; 
        itemDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:5px;">
                <div style="flex:1">
                    <h4 style="margin:0; color:#fff; font-size:0.9rem;">${item.name}</h4>
                    <p style="margin:5px 0; color:#e30613; font-weight:bold;">${item.price} ج.م</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="updateQty(${index}, -1)" style="background:#333; color:#fff; border:none; width:25px; border-radius:3px; cursor:pointer;">-</button>
                    <span style="color:#fff;">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQty(${index}, 1)" style="background:#333; color:#fff; border:none; width:25px; border-radius:3px; cursor:pointer;">+</button>
                    <i class="fas fa-trash" onclick="removeItem(${index})" style="color:#666; cursor:pointer; margin-left:10px;"></i>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
    updateSummary(subtotal);
}

// 6. تحديث الكمية (دعم مسجل + زائر)
window.updateQty = async (index, change) => {
    const newQty = cartItems[index].quantity + change;
    if (newQty < 1) return;

    cartItems[index].quantity = newQty;
    if (currentUserUID) {
        await updateDoc(doc(db, "carts", currentUserUID), { items: cartItems });
        loadCartData();
    } else {
        localStorage.setItem('sarab_guest_cart', JSON.stringify(cartItems));
        loadGuestCartData();
    }
};

// 7. حذف منتج (دعم مسجل + زائر)
window.removeItem = async (index) => {
    if (!confirm(`هل تريد إزالة ${cartItems[index].name} من السلة؟`)) return;

    cartItems.splice(index, 1);
    if (currentUserUID) {
        await updateDoc(doc(db, "carts", currentUserUID), { items: cartItems });
        loadCartData();
    } else {
        localStorage.setItem('sarab_guest_cart', JSON.stringify(cartItems));
        loadGuestCartData();
    }
    const counter = document.getElementById('cartCount');
    if (counter) counter.innerText = cartItems.length;
};

// 8. تحديث الملخص المالي
function updateSummary(subtotal) {
    const pureSubtotal = Number(subtotal) || 0;
    const shipping = pureSubtotal > 0 ? 50 : 0;
    const final = pureSubtotal + shipping;

    if (document.getElementById('subtotal')) document.getElementById('subtotal').innerText = `${pureSubtotal} ج.م`;
    if (document.getElementById('shipping-fee')) document.getElementById('shipping-fee').innerText = `${shipping} ج.م`;
    if (document.getElementById('final-total')) {
        const el = document.getElementById('final-total');
        el.innerText = `${final} ج.م`;
        el.style.color = "#e30613";
    }
}

// 9. زرار تأكيد الطلب
document.getElementById('confirmOrderBtn')?.addEventListener('click', async () => {
    if (cartItems.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    
    if (!currentUserUID) {
        alert("سيتم توجيهك لإكمال بيانات الشحن كزائر... ✨");
        // هنا ممكن تفتح Form للزائر يكتب بياناته لو مش مسجل
    } else {
        alert("جاري معالجة طلبك للانضمام لمقتنيات سراب... 🚀");
    }
});

// --- إدارة الواجهة العامة ---
function initUIControls() {
    const overlay = document.getElementById('panelOverlay');
    
    document.getElementById('menuOpen')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.add('active');
        overlay?.classList.add('active');
    });

    document.getElementById('myAccountBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('profilePanel')?.classList.add('active');
        overlay?.classList.add('active');
    });

    [overlay, document.getElementById('closeProfile')].forEach(el => {
        el?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('active');
            document.getElementById('profilePanel')?.classList.remove('active');
            overlay?.classList.remove('active');
        });
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        signOut(auth).then(() => window.location.reload());
    });
}

// تفعيل وضع التعديل
document.body.addEventListener('click', (e) => {
    if (e.target.closest('#editProfileBtn')) {
        const ids = ['displayFullName', 'displayPhone', 'displayAddress'];
        ids.forEach(id => {
            const input = document.getElementById(id);
            if(input) {
                input.removeAttribute('readonly');
                input.style.borderBottom = "2px solid #e30613";
                input.style.background = "rgba(227, 6, 19, 0.05)";
            }
        });
        alert("وضع التعديل نشط.. يمكنك تغيير بياناتك الآن ✨");
    }
});

window.addEventListener('DOMContentLoaded', initUIControls);