import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. إعدادات سراب الموحدة
const firebaseConfig = {
    apiKey: "AIzaSyD46OEVC7BJZPihUmeWSlMmMjmMoXorn1o",
    authDomain: "sarab-store.firebaseapp.com",
    projectId: "sarab-store",
    storageBucket: "sarab-store.firebasestorage.app",
    messagingSenderId: "629583443040",
    appId: "1:629583443040:web:150fcc4d517fc8f82fbf05",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

/* --- نظام إدارة الحالة (Auth State) --- */
onAuthStateChanged(auth, (user) => {
    const authArea = document.getElementById('auth-area');
    const sidebarFooter = document.getElementById('sidebarFooter');

    if (authArea) authArea.innerHTML = ""; 
    if (sidebarFooter) {
        sidebarFooter.style.display = 'none';
        sidebarFooter.innerHTML = ""; 
    }

    if (user) {
        if (authArea) {
            authArea.innerHTML = `
                <a href="#" id="myAccountBtn" class="nav-link" style="color: #fff; font-weight: bold; text-decoration: none; font-size: 0.9rem;">
                    <i class="far fa-user"></i> حسابي
                </a>
            `;
            document.getElementById('myAccountBtn').onclick = (e) => {
                e.preventDefault();
                document.getElementById('profilePanel').classList.add('active');
                document.getElementById('panelOverlay').classList.add('active');
            };
        }

        if (sidebarFooter) {
            sidebarFooter.style.display = 'block';
            sidebarFooter.innerHTML = `
                <button id="logoutBtnSide" class="logout-link" style="width: 100%; padding: 12px; background: rgba(227, 6, 19, 0.1); color: #ff4d4d; border: 1px solid rgba(227, 6, 19, 0.2); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </button>
            `;
            
            document.getElementById('logoutBtnSide').onclick = async () => {
                await signOut(auth);
                window.location.reload();
            };
        }
        updateCartBadge(user.uid);
    } else {
        if (authArea) {
            authArea.innerHTML = `
                <a href="login/login.html" class="nav-link" style="color: #fff; text-decoration: none;">
                    <i class="fas fa-sign-in-alt"></i> دخول
                </a>
            `;
        }
        if (sidebarFooter) sidebarFooter.style.display = 'none';
        updateCartBadge(null); 
    }
});

/* --- محرك المنتجات الديناميكي --- */
async function loadSarabProducts() {
    const productsContainer = document.getElementById("products-container");
    const offersContainer = document.getElementById("offers-container");

    if (!productsContainer) return;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productsContainer.innerHTML = "";
        if (offersContainer) offersContainer.innerHTML = "";

        if (querySnapshot.empty) {
            productsContainer.innerHTML = "<p class='empty-msg'>المجموعة فارغة حالياً.. </p>";
            if (offersContainer) offersContainer.innerHTML = "<p class='empty-msg'>لا توجد عروض حالياً.. انتظرونا قريباً! ✨</p>";
            return;
        }

        let hasOffers = false; // فحص وجود عروض

        querySnapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const id = docSnap.id;
            const finalPrice = p.hasDiscount ? (p.price - (p.price * (p.discountPercentage / 100))) : p.price;

            const productHTML = `
                <div class="product-card">
                    ${p.hasDiscount ? `<div class="discount-badge">خصم ${p.discountPercentage}%</div>` : ''}
                    <div class="product-image">
                        <img src="${p.image || 'img/placeholder.jpg'}" alt="${p.name}" loading="lazy">
                    </div>
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        <div class="price-area">
                            <span class="current-price">${finalPrice.toFixed(0)} ج.م</span>
                            ${p.hasDiscount ? `<span class="old-price">${p.price.toFixed(0)} ج.م</span>` : ''}
                        </div>
                        <p class="stock-info" style="color: ${p.inStock ? '#25d366' : '#e30613'}; font-size: 0.8rem; margin: 5px 0;">
                            ${p.inStock ? 'متوفر حالياً ✅' : '❌ نفذت الكمية'}
                        </p>
                        <button class="add-to-cart-btn" 
                                ${!p.inStock ? 'disabled style="background: #333; cursor: not-allowed;"' : ''}
                                onclick="addToSarabCart('${id}', '${p.name}', ${finalPrice}, '${p.image}')" 
                                style="background: linear-gradient(45deg, #e30613, #800000); color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: transform 0.3s ease, box-shadow 0.3s ease;">
                            ${p.inStock ? 'إضافة للسلة' : 'غير متوفر'}
                        </button>
                    </div>
                </div>
            `;

            if (p.showInStore) productsContainer.innerHTML += productHTML;
            
            if (p.showInOffers && offersContainer) {
                offersContainer.innerHTML += productHTML;
                hasOffers = true; // تم العثور على عرض
            }
        });

        // رسالة في حالة عدم وجود عروض حصرية
        if (!hasOffers && offersContainer) {
            offersContainer.innerHTML = `
                <div class="no-offers-msg" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888; background: rgba(255,255,255,0.02); border-radius: 15px; border: 1px dashed rgba(227, 6, 19, 0.3);">
                    <i class="fas fa-tag" style="font-size: 2rem; color: #e30613; margin-bottom: 15px; display: block;"></i>
                    <p style="font-size: 1.1rem; margin: 0;">لا توجد عروض حصرية حالياً..</p>
                    <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 10px;">انتظروا تشكيلة العروض الجديدة قريباً جداً ✨</p>
                </div>
            `;
        }

    } catch (error) {
        console.error("❌ فشل جلب المنتجات:", error);
    }
}

/* --- وظيفة السلة الذكية (مسجل + زائر) --- */
window.addToSarabCart = async (id, name, price, image) => {
    const user = auth.currentUser;

    if (user) {
        try {
            const cartRef = doc(db, "carts", user.uid);
            const cartSnap = await getDoc(cartRef);
            let items = cartSnap.exists() ? cartSnap.data().items || [] : [];
            const existingIndex = items.findIndex(i => i.id === id);
            if (existingIndex > -1) {
                items[existingIndex].quantity += 1;
            } else {
                items.push({ id, name, price, image, quantity: 1 });
            }
            await setDoc(cartRef, { items }, { merge: true });
            alert(`تم إضافة ${name} لسلتك بنجاح! 🚀`);
            updateCartBadge(user.uid);
        } catch (error) {
            console.error("❌ خطأ في السلة:", error);
        }
    } else {
        let guestCart = JSON.parse(localStorage.getItem('sarab_guest_cart')) || [];
        const existingIndex = guestCart.findIndex(i => i.id === id);
        if (existingIndex > -1) {
            guestCart[existingIndex].quantity += 1;
        } else {
            guestCart.push({ id, name, price, image, quantity: 1 });
        }
        localStorage.setItem('sarab_guest_cart', JSON.stringify(guestCart));
        alert(`تم إضافة ${name} للسلة كزائر! ✨`);
        updateCartBadge(null);
    }
};

async function updateCartBadge(uid) {
    const counter = document.getElementById('cartCount');
    if (!counter) return;

    if (uid) {
        const cartSnap = await getDoc(doc(db, "carts", uid));
        if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            counter.innerText = items.reduce((acc, item) => acc + item.quantity, 0);
        }
    } else {
        const guestCart = JSON.parse(localStorage.getItem('sarab_guest_cart')) || [];
        counter.innerText = guestCart.reduce((acc, item) => acc + item.quantity, 0);
    }
}

window.addEventListener('DOMContentLoaded', loadSarabProducts);

document.addEventListener("mousemove", (e) => {
    const mesh = document.querySelector(".mesh-gradient");
    if (mesh) {
        const x = (e.clientX / window.innerWidth) * 20;
        const y = (e.clientY / window.innerHeight) * 20;
        mesh.style.transform = `translate(${x}px, ${y}px)`;
    }
});