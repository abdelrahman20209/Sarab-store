// أدوات مشتركة للوحة التحكم: Firebase + دوال مساعدة + حالة البيانات
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAi3ae1vCSip7C7VTBOSdyyTDMbhD_pZuw",
  authDomain: "sarab-3tor.firebaseapp.com",
  projectId: "sarab-3tor",
  storageBucket: "sarab-3tor.firebasestorage.app",
  messagingSenderId: "132817463996",
  appId: "1:132817463996:web:6d63c584d1342b2598feb9",
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const bus = new EventTarget();
export const store = { orders: [], products: [], sections: [] };

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);

export const money = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " ج.م";

export const STATUS = {
  pending_payment: { label: "انتظار الدفع", tone: "warn" },
  pending: { label: "قيد المراجعة", tone: "warn" },
  paid: { label: "تم الدفع", tone: "info" },
  shipped: { label: "تم الشحن", tone: "violet" },
  on_the_way: { label: "في الطريق", tone: "violet" },
  delivered: { label: "تم التسليم", tone: "ok" },
  canceled: { label: "ملغي", tone: "bad" },
};
export const statusOf = (s) => STATUS[s] || { label: s || "—", tone: "mute" };

export function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}
export const fmtDate = (ts, withTime = true) => {
  const d = toDate(ts);
  if (!d) return "—";
  return d.toLocaleString("ar-EG", withTime
    ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
};
export function timeAgo(ts) {
  const d = toDate(ts);
  if (!d) return "";
  const m = Math.floor((Date.now() - d) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

// توحيد شكل الطلب لأن الحقول اتسجلت بأسماء مختلفة
export function normalizeOrder(id, o) {
  const items = o.cartItems || o.items || [];
  const c = o.customerInfo || {};
  return {
    id,
    ref: o.referenceCode || id.slice(0, 6).toUpperCase(),
    name: o.customerName || c.name || o.name || "زائر",
    phone: o.customerPhone || c.phone || o.phone || "",
    address: o.address || c.address || o.customerCity || c.city || "",
    total: Number(o.totalPrice ?? o.totalAmount ?? o.total ?? 0),
    status: o.status || "pending",
    eta: o.estimatedArrival || "",
    createdAt: o.createdAt || null,
    items: Array.isArray(items) ? items : [],
    userId: o.userId || "",
  };
}

export function waLink(phone, text = "") {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "2" + d;
  return `https://wa.me/${d}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}

let toastTimer;
export function toast(msg, type = "ok") {
  const t = $("#toast");
  if (!t) return;
  t.className = `toast show ${type}`;
  $("#toastText").textContent = msg;
  const icon = t.querySelector("i");
  icon.className = type === "err" ? "fas fa-triangle-exclamation" : type === "info" ? "fas fa-bell" : "fas fa-circle-check";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

export function openSheet(id) {
  $("#" + id).classList.add("open");
  $("#scrim").classList.add("open");
  document.body.classList.add("lock");
}
export function closeSheets() {
  $$(".sheet.open").forEach((s) => s.classList.remove("open"));
  $("#scrim").classList.remove("open");
  document.body.classList.remove("lock");
}
