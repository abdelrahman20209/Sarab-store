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

import { DEFAULTS, DEFAULT_ANNOUNCEMENT, safeUrl } from "./site-schema.js";

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

  const accountBtn = document.getElementById("accountBtn");
  if (accountBtn) {
    accountBtn.href = user ? "#" : "login/login.html";
    accountBtn.onclick = user
      ? (e) => {
          e.preventDefault();
          document.getElementById("profilePanel").classList.add("active");
          document.getElementById("panelOverlay").classList.add("active");
        }
      : null;
  }

  if (user) {
    if (authArea) {
      authArea.innerHTML = `
                <a href="#" id="myAccountBtn" class="nav-link">
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
                <button id="logoutBtnSide" class="logout-link">
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
                <a href="login/login.html" class="nav-link">
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
    showToast("سجّل دخولك أولاً لمتابعة طلباتك");
    return;
  }

  const trackingSection = document.getElementById("order-tracking-section");
  const homeView = document.getElementById("home-view");
  if (!trackingSection) return;

  trackingSection.style.display = "block";
  if (homeView) homeView.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });

  const ordersList = document.getElementById("orders-list");
  if (!ordersList) return;
  ordersList.innerHTML = '<p style="color: var(--muted); text-align: center;">جاري جلب طلباتك...</p>';

  const q = query(collection(db, "orders"), where("userId", "==", user.uid));
  const querySnapshot = await getDocs(q);

  ordersList.innerHTML = "";
  if (querySnapshot.empty) {
    ordersList.innerHTML = '<p style="text-align: center; color: var(--muted);">لا توجد طلبات سابقة لك في سراب.</p>';
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const order = docSnap.data();
    const id = docSnap.id;
    ordersList.innerHTML += `
      <div class="order-rect" onclick="viewOrderDetails('${id}')">
        <div class="rect-info">
          <span class="rect-id">طلب رقم: #${id.slice(-5)}</span>
          <span class="rect-date" style="color: var(--muted); font-size: 0.8rem;">${order.date || "جاري المعالجة"}</span>
        </div>
        <div class="rect-status-badge ${order.status}">${order.status || "pending"}</div>
        <i class="fas fa-chevron-left" style="color: var(--red);"></i>
      </div>`;
  });
};

window.hideTrackingPage = (event) => {
  if (event) event.preventDefault();
  document.getElementById("order-tracking-section").style.display = "none";
  document.getElementById("home-view").style.display = "";
  window.scrollTo({ top: 0 });
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

  const statusMap = { pending: 0, pending_payment: 0, processing: 1, paid: 1, shipped: 2, on_the_way: 2, delivered: 3 };
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

let SITE = { ...DEFAULTS };
let allProducts = [];
let activeFilter = "all";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
const T = (k) => (SITE[k] != null && SITE[k] !== "" ? SITE[k] : DEFAULTS[k] ?? "");
const priceOf = (p) => (p.hasDiscount ? p.price - p.price * (p.discountPercentage / 100) : p.price);

function productCardHTML(id, p, i) {
  const finalPrice = priceOf(p);
  const img = esc(p.image || "img/placeholder.jpg");
  return `
    <div class="product-card" data-name="${esc((p.name || "").toLowerCase())}" data-gender="${esc(p.gender || "unisex")}" style="animation-delay:${Math.min(i, 8) * 70}ms">
      ${p.hasDiscount ? `<div class="discount-badge">خصم ${esc(p.discountPercentage)}%</div>` : ""}
      <div class="product-image" onclick="showProductDetails('${esc(id)}')">
        <img src="${img}" alt="${esc(p.name)}" loading="lazy">
        ${getGenderIcon(p.gender)}
      </div>
      <div class="product-info">
        <h3 onclick="showProductDetails('${esc(id)}')">${esc(p.name)}</h3>
        <div class="price-area">
          <span class="current-price">${finalPrice.toFixed(0)} ج.م</span>
          ${p.hasDiscount ? `<span class="old-price">${Number(p.price).toFixed(0)} ج.م</span>` : ""}
        </div>
        <p class="stock-info ${p.inStock ? "in" : "out"}">${esc(p.inStock ? T("txt_in") : T("txt_out"))}</p>
        <div class="card-btns">
          <button class="add-to-cart-btn" ${!p.inStock ? "disabled" : ""} onclick="addProductById('${esc(id)}')">${esc(p.inStock ? T("txt_add") : T("txt_out"))}</button>
          <button class="view-details-btn" aria-label="تفاصيل" onclick="showProductDetails('${esc(id)}')"><i class="fas fa-eye"></i></button>
        </div>
      </div>
    </div>`;
}

window.addProductById = (id) => {
  const x = allProducts.find((a) => a.id === id);
  if (x) window.addToSarabCart(id, x.p.name, priceOf(x.p), x.p.image || "");
};

function renderProducts() {
  const productsContainer = document.getElementById("products-container");
  const offersContainer = document.getElementById("offers-container");
  const term = (document.getElementById("search-input")?.value || "").trim().toLowerCase();
  const match = (p) =>
    (activeFilter === "all" || (p.gender || "unisex") === activeFilter) &&
    (!term || (p.name || "").toLowerCase().includes(term));

  const store = allProducts.filter(({ p }) => p.showInStore && match(p));
  const offers = allProducts.filter(({ p }) => p.showInOffers && match(p));

  productsContainer.innerHTML = store.map(({ id, p }, i) => productCardHTML(id, p, i)).join("");
  if (offersContainer) {
    offersContainer.innerHTML = offers.length
      ? offers.map(({ id, p }, i) => productCardHTML(id, p, i)).join("")
      : `<div class="no-offers-msg">لا توجد عروض حصرية حالياً..</div>`;
  }
  if (!store.length && !allProducts.length) {
    productsContainer.innerHTML = "<p class='empty-msg'>المجموعة فارغة حالياً..</p>";
  }
  const noRes = document.getElementById("no-results-message");
  if (noRes) noRes.style.display = allProducts.length && !store.length ? "block" : "none";
}

async function loadSarabProducts() {
  const productsContainer = document.getElementById("products-container");
  if (!productsContainer) return;
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    allProducts = querySnapshot.docs.map((d) => ({ id: d.id, p: d.data() }));
    renderProducts();
    loadSections();
  } catch (error) {
    console.error("❌ فشل جلب المنتجات:", error);
    productsContainer.innerHTML = "<p class='empty-msg'>تعذّر تحميل العطور، حاول مرة أخرى.</p>";
  }
}

window.searchSarabProducts = () => renderProducts();

document.getElementById("categoryChips")?.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#categoryChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
  activeFilter = chip.dataset.filter;
  renderProducts();
});

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
      if (!iconContainer) {}
      else if (p.gender === "men") iconContainer.innerHTML = '<i class="fas fa-mars icon-men"></i>';
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
      showToast(`تمت إضافة ${name} للسلة`);
      updateCartBadge(user.uid);
    } catch (error) { console.error(error); }
  } else {
    let guestCart = JSON.parse(localStorage.getItem("sarab_guest_cart")) || [];
    const existingIndex = guestCart.findIndex((i) => i.id === id);
    if (existingIndex > -1) guestCart[existingIndex].quantity += 1;
    else guestCart.push({ id, name, price, image, quantity: 1 });
    localStorage.setItem("sarab_guest_cart", JSON.stringify(guestCart));
    showToast(`تمت إضافة ${name} للسلة`);
    updateCartBadge(null);
  }
};

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return alert(msg);
  document.getElementById("toastText").textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

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

/* ==========================================================
   محتوى الموقع من لوحة التحكم: نصوص + صور + إعلان + أقسام
   ========================================================== */
const $id = (i) => document.getElementById(i);

function applySite() {
  document.querySelectorAll("[data-cms]").forEach((el) => {
    const v = SITE[el.dataset.cms];
    if (v != null && v !== "") el.textContent = v;
  });
  document.querySelectorAll("[data-cms-img]").forEach((el) => {
    const v = safeUrl(SITE[el.dataset.cmsImg]);
    if (v) el.src = v;
  });
  document.querySelectorAll("[data-cms-ph]").forEach((el) => {
    const v = SITE[el.dataset.cmsPh];
    if (v) el.placeholder = v;
  });
  const wa = String(SITE.whatsapp || DEFAULTS.whatsapp).replace(/\D/g, "");
  document.querySelectorAll("[data-wa]").forEach((a) => (a.href = `https://wa.me/${wa}`));
  document.querySelectorAll("[data-social]").forEach((a) => {
    const k = a.dataset.social;
    if (k === "email") { a.href = `mailto:${SITE.email || DEFAULTS.email}`; return; }
    const url = safeUrl(SITE[k]);
    a.hidden = !url;
    if (url) a.href = url;
  });
  // الشريط المتحرك: نكرر المحتوى لحلقة سلسة
  const tr = $id("marqueeTrack");
  if (tr) {
    tr.querySelectorAll("[data-clone]").forEach((n) => n.remove());
    const base = [...tr.children];
    for (let r = 0; r < 3; r++) base.forEach((n) => { const c = n.cloneNode(true); c.dataset.clone = "1"; c.removeAttribute("data-cms"); tr.appendChild(c); });
  }
}

let annTimer;
function applyAnnouncement(raw) {
  const a = { ...DEFAULT_ANNOUNCEMENT, ...(raw || {}) };
  const bar = $id("announce");
  if (!bar) return;
  clearInterval(annTimer);
  const exp = a.expiresAt ? new Date(a.expiresAt) : null;
  const sig = [...(a.text + "|" + (a.expiresAt || ""))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  let closed = false;
  try { closed = localStorage.getItem("sarab_ann_" + sig) === "1"; } catch {}
  if (!a.enabled || !a.text || (exp && exp <= new Date()) || closed) { bar.hidden = true; return; }

  bar.hidden = false;
  bar.className = "announce " + (["gold", "black"].includes(a.style) ? a.style : "red") + (a.text.length > 70 ? " scroll" : "");
  $id("annText").textContent = a.text;
  const link = $id("annLink");
  const url = safeUrl(a.link);
  link.hidden = !url;
  if (url) { link.href = url; link.textContent = a.linkText || "اعرف المزيد"; }
  $id("annClose").onclick = () => { bar.hidden = true; try { localStorage.setItem("sarab_ann_" + sig, "1"); } catch {} };

  const timer = $id("annTimer");
  timer.hidden = !(a.showCountdown && exp);
  if (a.showCountdown && exp) {
    const tick = () => {
      const ms = exp - Date.now();
      if (ms <= 0) { bar.hidden = true; clearInterval(annTimer); return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, sec = Math.floor(ms / 1e3) % 60;
      const p = (n) => String(n).padStart(2, "0");
      timer.textContent = (d ? d + "d " : "") + `${p(h)}:${p(m)}:${p(sec)}`;
    };
    tick();
    annTimer = setInterval(tick, 1000);
  }
}

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (snap.exists()) {
      const d = snap.data();
      SITE = { ...DEFAULTS, ...(d.texts || {}), ...(d.images || {}) };
      applySite();
      applyAnnouncement(d.announcement);
      if (allProducts.length) { renderProducts(); loadSections(); }
      return;
    }
  } catch (e) { console.warn("settings:", e.message); }
  applySite();
  applyAnnouncement(null);
}

async function loadSections() {
  const host = $id("custom-sections");
  if (!host) return;
  try {
    const snap = await getDocs(collection(db, "sections"));
    const secs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    host.innerHTML = secs.map((sec) => {
      const items = (sec.productIds || []).map((id) => allProducts.find((x) => x.id === id)).filter(Boolean);
      if (!items.length) return "";
      return `
      <section class="rail-section">
        <div class="wrap">
          <div class="rail-head">
            <div>${sec.subtitle ? `<div class="kicker">${esc(sec.subtitle)}</div>` : ""}<h2>${esc(sec.title)}</h2></div>
            <div class="rail-nav">
              <button data-rail="prev" aria-label="السابق"><i class="fas fa-chevron-right"></i></button>
              <button data-rail="next" aria-label="التالي"><i class="fas fa-chevron-left"></i></button>
            </div>
          </div>
          <div class="rail">${items.map((x, i) => productCardHTML(x.id, x.p, i)).join("")}</div>
        </div>
      </section>`;
    }).join("");
  } catch (e) { console.warn("sections:", e.message); }
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-rail]");
  if (b) {
    const rail = b.closest(".wrap").querySelector(".rail");
    const dir = b.dataset.rail === "next" ? -1 : 1; // الصفحة RTL
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: "smooth" });
    return;
  }
  const go = e.target.closest("[data-filter-go]");
  if (go) {
    const chip = document.querySelector(`#categoryChips .chip[data-filter="${go.dataset.filterGo}"]`);
    chip?.click();
  }
});

window.addEventListener("DOMContentLoaded", loadSiteSettings);
