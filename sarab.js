import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. الإعدادات
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

/* --- نظام إدارة الحالة (Auth State) --- */
onAuthStateChanged(auth, (user) => {
  const authArea = document.getElementById("auth-area");
  const sidebarFooter = document.getElementById("sidebarFooter");

  if (authArea) authArea.innerHTML = "";
  if (sidebarFooter) {
    sidebarFooter.style.display = "none";
    sidebarFooter.innerHTML = "";
  }

  if (user) {
    if (authArea) {
      authArea.innerHTML = `
                <a href="#" id="myAccountBtn" class="nav-link" style="color: #fff; font-weight: bold; text-decoration: none; font-size: 0.9rem;">
                    <i class="far fa-user"></i> حسابي
                </a>
            `;
      document.getElementById("myAccountBtn").onclick = (e) => {
        e.preventDefault();
        document.getElementById("profilePanel").classList.add("active");
        document.getElementById("panelOverlay").classList.add("active");
      };
    }

    if (sidebarFooter) {
      sidebarFooter.style.display = "block";
      sidebarFooter.innerHTML = `
                <button id="logoutBtnSide" class="logout-link" style="width: 100%; padding: 12px; background: rgba(227, 6, 19, 0.1); color: #ff4d4d; border: 1px solid rgba(227, 6, 19, 0.2); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </button>
            `;
      document.getElementById("logoutBtnSide").onclick = async () => {
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
    updateCartBadge(null);
  }
});

/* --- محرك متابعة الطلبات الجديد (مستطيلات + تفاصيل) --- */
window.showTrackingPage = async (event) => {
    if (event) event.preventDefault();
    const user = auth.currentUser;

    if (!user) {
        alert("من فضلك سجل دخولك أولاً لمشاهدة مقتنياتك في سراب ✨");
        return;
    }

    const trackingSection = document.getElementById('order-tracking-section');
    const productsSection = document.getElementById('products-container')?.parentElement;
    const offersSection = document.getElementById('offers-container')?.parentElement;

    if (trackingSection) {
        trackingSection.style.display = 'block';
        if (productsSection) productsSection.style.display = 'none';
        if (offersSection) offersSection.style.display = 'none';
        trackingSection.scrollIntoView({ behavior: 'smooth' });

        // جلب الطلبات الخاصة بالمستخدم وعرضها كمستطيلات
        const ordersList = document.getElementById('orders-list');
        if (ordersList) {
            ordersList.innerHTML = '<p style="color: #555; text-align: center;">جاري جلب طلباتك الفاخرة...</p>';
            
            const q = query(collection(db, "orders"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            
            ordersList.innerHTML = "";
            if (querySnapshot.empty) {
                ordersList.innerHTML = '<p style="color: #fff; text-align: center;">لا توجد طلبات سابقة لك في سراب.</p>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const order = docSnap.data();
                const id = docSnap.id;
                const rectHTML = `
                    <div class="order-rect" onclick="viewOrderDetails('${id}')" style="cursor: pointer;">
                        <div class="rect-info">
                            <span class="rect-id">طلب رقم: #${id.slice(-5)}</span>
                            <span class="rect-date" style="color: #555; font-size: 0.8rem;">${order.date || 'جاري المعالجة'}</span>
                        </div>
                        <div class="rect-status-badge ${order.status}" style="font-size: 0.7rem;">${order.status || 'pending'}</div>
                        <i class="fas fa-chevron-left" style="color: #e30613;"></i>
                    </div>
                `;
                ordersList.innerHTML += rectHTML;
            });
        }
    }
};

window.viewOrderDetails = (orderId) => {
    const orderRef = doc(db, "orders", orderId);
    // استخدام onSnapshot لجعلها مراية للأدمن لحظياً
    onSnapshot(orderRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const modal = document.getElementById('order-details-modal');
            if (modal) {
                modal.classList.add('active');
                updateTrackingUI(data); // تحديث الـ UI بالتفاصيل والـ Stepper
            }
        }
    });
};

window.closeOrderDetails = () => {
    document.getElementById('order-details-modal')?.classList.remove('active');
};

function updateTrackingUI(data) {
  if (document.getElementById("display-order-id"))
    document.getElementById("display-order-id").innerText = data.orderId || "غير معروف";
  if (document.getElementById("display-order-date"))
    document.getElementById("display-order-date").innerText = data.date || "قيد المعالجة";
  
  // بيانات العطر
  if (document.getElementById("tracking-car-model"))
    document.getElementById("tracking-car-model").innerText = data.perfumeName || "عطر سراب الفاخر";
  if (document.getElementById("tracking-car-color"))
    document.getElementById("tracking-car-color").innerText = data.size || "100 مل";

  const price = data.price || 0;
  if (document.getElementById("total-price"))
    document.getElementById("total-price").innerText = `${(price * 1.14).toLocaleString()} ج.م`;

  const steps = ["step-pending", "step-processing", "step-shipped", "step-delivered"];
  steps.forEach((step) => document.getElementById(step)?.classList.remove("active"));

  const statusMap = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
  const currentIdx = statusMap[data.status] ?? -1;
  steps.forEach((stepId, idx) => {
    if (idx <= currentIdx) document.getElementById(stepId)?.classList.add("active");
  });
}

/* --- محرك المنتجات والسلة (كما هو بدون تغيير حرف) --- */
function getGenderIcon(gender) {
  if (gender === "men") return '<div class="gender-icon-container"><i class="fas fa-mars icon-men"></i></div>';
  if (gender === "women") return '<div class="gender-icon-container"><i class="fas fa-venus icon-women"></i></div>';
  return '<div class="gender-icon-container"><i class="fas fa-venus-mars icon-unisex"></i></div>';
}

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
      return;
    }
    let hasOffers = false;
    querySnapshot.forEach((docSnap) => {
      const p = docSnap.data();
      const id = docSnap.id;
      const finalPrice = p.hasDiscount ? p.price - p.price * (p.discountPercentage / 100) : p.price;
      const productHTML = `
                <div class="product-card">
                    ${p.hasDiscount ? `<div class="discount-badge">خصم ${p.discountPercentage}%</div>` : ""}
                    <div class="product-image" onclick="showProductDetails('${id}')" style="cursor: pointer; position: relative;">
                        <img src="${p.image || "img/placeholder.jpg"}" alt="${p.name}" loading="lazy">
                        ${getGenderIcon(p.gender)}
                    </div>
                    <div class="product-info">
                        <h3 onclick="showProductDetails('${id}')" style="cursor: pointer;">${p.name}</h3>
                        <div class="price-area">
                            <span class="current-price">${finalPrice.toFixed(0)} ج.م</span>
                            ${p.hasDiscount ? `<span class="old-price">${p.price.toFixed(0)} ج.م</span>` : ""}
                        </div>
                        <p class="stock-info" style="color: ${p.inStock ? "#25d366" : "#e30613"}; font-size: 0.8rem; margin: 5px 0;">
                            ${p.inStock ? "متوفر حالياً ✅" : "❌ نفذت الكمية"}
                        </p>
                        <div class="card-btns" style="display: flex; gap: 5px; margin-top: 10px;">
                            <button class="add-to-cart-btn" ${!p.inStock ? 'disabled style="background: #333; flex: 4;"' : 'style="flex: 4;"'} onclick="addToSarabCart('${id}', '${p.name}', ${finalPrice}, '${p.image}')">${p.inStock ? "إضافة للسلة" : "نفذت"}</button>
                            <button class="view-details-btn" onclick="showProductDetails('${id}')" style="flex: 1; background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 5px; cursor: pointer;"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                </div>`;
      if (p.showInStore) productsContainer.innerHTML += productHTML;
      if (p.showInOffers && offersContainer) { offersContainer.innerHTML += productHTML; hasOffers = true; }
    });
    if (!hasOffers && offersContainer) offersContainer.innerHTML = `<div class="no-offers-msg">لا توجد عروض حصرية حالياً..</div>`;
  } catch (error) { console.error("❌ فشل جلب المنتجات:", error); }
}

window.showProductDetails = async (id) => {
  const modal = document.getElementById("productDetailsModal");
  if (!modal) return;
  try {
    const docSnap = await getDoc(doc(db, "products", id));
    if (docSnap.exists()) {
      const p = docSnap.data();
      const finalPrice = p.hasDiscount ? p.price - p.price * (p.discountPercentage / 100) : p.price;
      document.getElementById("modalProductImage").src = p.image || "img/placeholder.jpg";
      document.getElementById("modalProductName").innerText = p.name;
      document.getElementById("modalProductDescription").innerText = p.description || "عطر فاخر من مقتنيات سراب..";
      document.getElementById("modalProductSize").innerText = p.size || "100";
      document.getElementById("modalProductPrice").innerText = finalPrice.toFixed(0);
      const iconContainer = document.getElementById("modalGenderIcon");
      if (p.gender === "men") iconContainer.innerHTML = '<i class="fas fa-mars icon-men"></i>';
      else if (p.gender === "women") iconContainer.innerHTML = '<i class="fas fa-venus icon-women"></i>';
      else iconContainer.innerHTML = '<i class="fas fa-venus-mars icon-unisex"></i>';
      const modalAddBtn = document.getElementById("modalAddToCartBtn");
      modalAddBtn.onclick = () => { addToSarabCart(id, p.name, finalPrice, p.image); window.closeProductDetails(); };
      modal.classList.add("active");
      document.getElementById("panelOverlay").classList.add("active");
    }
  } catch (err) { console.error(err); }
};

window.closeProductDetails = () => {
  document.getElementById("productDetailsModal")?.classList.remove("active");
  document.getElementById("order-details-modal")?.classList.remove("active"); // قفل مودال الطلبات أيضاً
  document.getElementById("panelOverlay")?.classList.remove("active");
};

window.addToSarabCart = async (id, name, price, image) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      let items = cartSnap.exists() ? cartSnap.data().items || [] : [];
      const existingIndex = items.findIndex((i) => i.id === id);
      if (existingIndex > -1) items[existingIndex].quantity += 1;
      else items.push({ id, name, price, image, quantity: 1 });
      await setDoc(cartRef, { items }, { merge: true });
      showToast(`تمت إضافة ${name} للسله! 🚀`);
      updateCartBadge(user.uid);
    } catch (error) { console.error(error); }
  } else {
    let guestCart = JSON.parse(localStorage.getItem("sarab_guest_cart")) || [];
    const existingIndex = guestCart.findIndex((i) => i.id === id);
    if (existingIndex > -1) guestCart[existingIndex].quantity += 1;
    else guestCart.push({ id, name, price, image, quantity: 1 });
    localStorage.setItem("sarab_guest_cart", JSON.stringify(guestCart));
    showToast(`تمت إضافة ${name} كزائر ✨`);
    updateCartBadge(null);
  }
};

function showToast(msg) { alert(msg); }

async function updateCartBadge(uid) {
  const counter = document.getElementById("cartCount");
  if (!counter) return;
  let total = 0;
  if (uid) {
    const cartSnap = await getDoc(doc(db, "carts", uid));
    if (cartSnap.exists()) {
      const items = cartSnap.data().items || [];
      total = items.reduce((acc, item) => acc + item.quantity, 0);
    }
  } else {
    const guestCart = JSON.parse(localStorage.getItem("sarab_guest_cart")) || [];
    total = guestCart.reduce((acc, item) => acc + item.quantity, 0);
  }
  counter.innerText = total;
}

document.getElementById("panelOverlay")?.addEventListener("click", window.closeProductDetails);
window.addEventListener("DOMContentLoaded", loadSarabProducts);