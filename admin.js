// نقطة تشغيل لوحة التحكم: بوابة الدخول + التنقل
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, $, $$, closeSheets, toast } from "./admin-core.js";
import { ADMIN_EMAILS } from "./admin-config.js";
import { initOrders } from "./admin-orders.js";
import { initProducts } from "./admin-products.js";
import { initCustomers } from "./admin-customers.js";
import { initStats, renderStats } from "./admin-stats.js";
import { initSections } from "./admin-sections.js";
import { initContent } from "./admin-content.js";

const VIEWS = {
  dashboard: ["نظرة عامة", "ملخص أداء المتجر لحظة بلحظة"],
  orders: ["الطلبات", "متابعة الطلبات وتحديث حالاتها"],
  products: ["المنتجات", "إدارة العطور والأسعار والعروض"],
  sections: ["أقسام الصفحة", "رتّب أقسام الصفحة الرئيسية واختر منتجاتها"],
  content: ["محتوى الموقع", "الإعلانات وكل النصوص والصور"],
  customers: ["العملاء", "كل من تعامل مع سراب"],
};

function show(state) {
  ["splash", "authView", "app"].forEach((id) => ($("#" + id).hidden = true));
  $("#splash").hidden = state !== "splash";
  $("#authView").hidden = state !== "login" && state !== "denied";
  $("#app").hidden = state !== "app";
  $("#loginCard").hidden = state !== "login";
  $("#deniedCard").hidden = state !== "denied";
}

async function isAdmin(user) {
  if (ADMIN_EMAILS.map((e) => e.toLowerCase()).includes((user.email || "").toLowerCase())) return true;
  try { return (await getDoc(doc(db, "admins", user.uid))).exists(); } catch { return false; }
}

const AUTH_ERR = {
  "auth/invalid-credential": "الإيميل أو كلمة المرور غير صحيحة",
  "auth/invalid-email": "صيغة الإيميل غير صحيحة",
  "auth/user-not-found": "لا يوجد حساب بهذا الإيميل",
  "auth/wrong-password": "كلمة المرور غير صحيحة",
  "auth/too-many-requests": "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة",
  "auth/network-request-failed": "تأكد من اتصال الإنترنت",
};

let started = false;
function startApp(user) {
  $("#userEmail").textContent = user.email || "";
  $("#userInitial").textContent = (user.email || "A").charAt(0).toUpperCase();
  show("app");
  if (started) return;
  started = true;
  initOrders();
  initProducts();
  initCustomers();
  initStats();
  initSections();
  initContent();
  watchIdle();
  go(location.hash.slice(1) in VIEWS ? location.hash.slice(1) : "dashboard");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return show("login");
  show("splash");
  if (await isAdmin(user)) return startApp(user);
  $("#deniedEmail").textContent = user.email || user.uid;
  $("#deniedUid").textContent = user.uid;
  show("denied");
});

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  const err = $("#loginErr");
  err.textContent = "";
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الدخول...`;
  try {
    await signInWithEmailAndPassword(auth, $("#loginEmail").value.trim(), $("#loginPass").value);
  } catch (ex) {
    err.textContent = AUTH_ERR[ex.code] || "تعذر تسجيل الدخول";
  } finally {
    btn.disabled = false;
    btn.innerHTML = `دخول <i class="fas fa-arrow-left"></i>`;
  }
});
$("#togglePass").onclick = () => {
  const i = $("#loginPass");
  i.type = i.type === "password" ? "text" : "password";
  $("#togglePass i").className = i.type === "password" ? "far fa-eye" : "far fa-eye-slash";
};
$$("[data-act='logout']").forEach((b) => (b.onclick = () => signOut(auth)));
$("#copyUid").onclick = async () => { try { await navigator.clipboard.writeText($("#deniedUid").textContent); toast("تم نسخ المعرّف"); } catch {} };

// ---- التنقل ----
function go(view) {
  if (!VIEWS[view]) view = "dashboard";
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  $$("[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("#pageTitle").textContent = VIEWS[view][0];
  $("#pageSub").textContent = VIEWS[view][1];
  history.replaceState(null, "", "#" + view);
  window.scrollTo({ top: 0 });
  if (view === "dashboard") requestAnimationFrame(renderStats);
}
$$("[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
$$("[data-go]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); go(b.dataset.go); }));

// ---- النوافذ ----
$("#scrim").addEventListener("click", closeSheets);
$$("[data-close]").forEach((b) => b.addEventListener("click", closeSheets));
document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheets());

// ---- أمان الجلسة: خروج تلقائي بعد 30 دقيقة بدون نشاط ----
const IDLE_MS = 30 * 60 * 1000;
let idleTimer;
function watchIdle() {
  const reset = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => { await signOut(auth); toast("تم تسجيل الخروج تلقائياً لعدم النشاط", "info"); }, IDLE_MS);
  };
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
  reset();
}
