// أدوات مشتركة لكل صفحات المتجر: Firebase + السلة + إعدادات الموقع + دوال مساعدة
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig, API_URL } from "./config.js";
import { DEFAULTS, DEFAULT_ANNOUNCEMENT, DEFAULT_SHOP, safeUrl } from "../site-schema.js";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { safeUrl, API_URL };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
export const money = (n) => Math.round(Number(n) || 0).toLocaleString("en-US") + " ج.م";
export const priceOf = (p) =>
  Math.round(p.hasDiscount && p.discountPercentage > 0 ? p.price - p.price * (p.discountPercentage / 100) : Number(p.price) || 0);

/* ---------------- المستخدم ---------------- */
let userReady;
export function whenUser() {
  userReady ||= new Promise((res) => {
    const off = onAuthStateChanged(auth, (u) => { off(); res(u); });
  });
  return userReady;
}
export const onUser = (cb) => onAuthStateChanged(auth, cb);

/* ---------------- السلة (محفوظة على الجهاز، تعمل قبل تسجيل الدخول) ---------------- */
const CART_KEY = "sarab_cart_v2";
export function getCart() {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(c) ? c.filter((i) => i && i.id && i.quantity > 0) : [];
  } catch { return []; }
}
export function setCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new CustomEvent("cart", { detail: items }));
}
export const cartCount = () => getCart().reduce((a, i) => a + Number(i.quantity || 0), 0);
export const cartTotal = (items = getCart()) => items.reduce((a, i) => a + Number(i.price || 0) * Number(i.quantity || 0), 0);
export function addToCart(id, p, qty = 1) {
  const items = getCart();
  const hit = items.find((i) => i.id === id);
  if (hit) hit.quantity = Math.min(20, hit.quantity + qty);
  else items.push({ id, name: p.name || "", price: priceOf(p), image: p.image || "", size: p.size || "", quantity: qty });
  setCart(items);
}
window.addEventListener("storage", (e) => { if (e.key === CART_KEY) window.dispatchEvent(new CustomEvent("cart")); });

/* ---------------- إعدادات الموقع (نصوص/صور/إعلان/دفع) ---------------- */
let sitePromise;
export function loadSite() {
  sitePromise ||= (async () => {
    const out = { texts: { ...DEFAULTS }, announcement: { ...DEFAULT_ANNOUNCEMENT }, shop: { ...DEFAULT_SHOP } };
    try {
      const [site, shop] = await Promise.all([getDoc(doc(db, "settings", "site")), getDoc(doc(db, "settings", "shop"))]);
      if (site.exists()) {
        const d = site.data();
        Object.entries({ ...(d.texts || {}), ...(d.images || {}) }).forEach(([k, v]) => { if (v != null && v !== "") out.texts[k] = v; });
        if (d.announcement) out.announcement = { ...DEFAULT_ANNOUNCEMENT, ...d.announcement };
      }
      if (shop.exists()) out.shop = { ...DEFAULT_SHOP, ...shop.data() };
    } catch (e) { console.warn("settings:", e.message); }
    return out;
  })();
  return sitePromise;
}

let sectionsPromise;
export function loadSections() {
  sectionsPromise ||= getDocs(collection(db, "sections"))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    .catch((e) => { console.warn("sections:", e.message); return []; });
  return sectionsPromise;
}

let productsPromise;
export function loadProducts() {
  productsPromise ||= getDocs(collection(db, "products")).then((s) =>
    s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.showInStore !== false));
  return productsPromise;
}

export async function loadZones() {
  const s = await getDocs(collection(db, "zones"));
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((z) => z.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name), "ar"));
}

/* ---------------- حساب الفاتورة ----------------
   يدفع العميل الآن (تحويل): الشحن كاملاً + نسبة المقدم من سعر المنتجات.
   والباقي يدفعه للمندوب عند الاستلام. */
export function invoice(items, zone) {
  const subtotal = Math.round(cartTotal(items));
  const shipping = Math.max(0, Math.round(Number(zone?.shipping) || 0));
  const depositPct = Math.min(100, Math.max(0, Number(zone?.depositPct) || 0));
  const deposit = Math.round((subtotal * depositPct) / 100);
  return { subtotal, shipping, depositPct, deposit, payNow: shipping + deposit, payOnDelivery: subtotal - deposit, total: subtotal + shipping };
}

/* ---------------- حالات الطلب ---------------- */
export const STATUS = {
  pending_payment: { label: "بانتظار تأكيد التحويل", tone: "warn", step: 0 },
  pending: { label: "بانتظار تأكيد التحويل", tone: "warn", step: 0 },
  paid: { label: "تم تأكيد الدفع", tone: "info", step: 1 },
  shipped: { label: "تم الشحن", tone: "violet", step: 2 },
  on_the_way: { label: "في الطريق إليك", tone: "violet", step: 2 },
  delivered: { label: "تم التسليم", tone: "ok", step: 3 },
  canceled: { label: "ملغي", tone: "bad", step: -1 },
};
export const statusOf = (s) => STATUS[s] || { label: s || "—", tone: "mute", step: 0 };

export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}
export const fmtDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleString("ar-EG", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
};

export function waLink(phone, text = "") {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "2" + d;
  return `https://wa.me/${d}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}

/* ---------------- تنبيه صغير ---------------- */
let toastTimer;
export function toast(msg, type = "ok") {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.className = `toast show ${type}`;
  t.innerHTML = `<i class="fas ${type === "err" ? "fa-triangle-exclamation" : "fa-circle-check"}"></i><span>${esc(msg)}</span>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ---------------- سيرفر الإيميلات ---------------- */
export async function api(path, body, token) {
  if (!API_URL) throw new Error("خدمة الإيميل غير مفعّلة بعد");
  let res;
  try {
    res = await fetch(API_URL.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: JSON.stringify(body || {}),
    });
  } catch { throw new Error("تعذر الاتصال بالخادم، تأكد من الإنترنت"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "حدث خطأ، حاول مرة أخرى");
  return data;
}

export const AUTH_ERR = {
  "auth/invalid-credential": "الإيميل أو كلمة المرور غير صحيحة",
  "auth/invalid-email": "صيغة الإيميل غير صحيحة",
  "auth/user-not-found": "لا يوجد حساب بهذا الإيميل",
  "auth/wrong-password": "كلمة المرور غير صحيحة",
  "auth/email-already-in-use": "هذا الإيميل مسجّل بالفعل — سجّل دخولك",
  "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل)",
  "auth/too-many-requests": "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة",
  "auth/network-request-failed": "تأكد من اتصال الإنترنت",
  "auth/operation-not-allowed": "تسجيل الدخول بالإيميل غير مفعّل في Firebase",
};
export const authMsg = (e) => AUTH_ERR[e?.code] || e?.message || "حدث خطأ";

// رابط آمن للرجوع بعد تسجيل الدخول (صفحات الموقع فقط)
export function nextUrl(fallback = "index.html") {
  const n = new URLSearchParams(location.search).get("next") || "";
  return /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(n) ? n : fallback;
}
