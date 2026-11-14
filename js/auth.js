// تسجيل الدخول + حساب جديد بكود تفعيل على الإيميل (OTP) + استعادة كلمة المرور
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { $, $$, db, auth, whenUser, api, authMsg, nextUrl } from "./core.js";
import { initLayout } from "./layout.js";

const page = document.body.dataset.page;
const next = nextUrl(page === "signup" ? "index.html" : "account.html");
const qNext = new URLSearchParams(location.search).get("next");

initLayout("account");
// لو مسجّل دخول بالفعل، لا داعي لهذه الصفحة
let busy = false;
whenUser().then((u) => { if (u && !busy && page !== "forgot") location.replace(next); });

if (qNext) {
  const suffix = "?next=" + encodeURIComponent(qNext);
  ["toSignup", "toLogin"].forEach((id) => { const a = $("#" + id); if (a) a.href += suffix; });
}
$$("[data-eye]").forEach((b) => (b.onclick = () => {
  const i = b.parentElement.querySelector("input");
  i.type = i.type === "password" ? "text" : "password";
  b.firstElementChild.className = i.type === "password" ? "far fa-eye" : "far fa-eye-slash";
}));

const digits = (v) => String(v || "").replace(/[^\d]/g, "").replace(/^(?:0020|20)(?=1)/, "0");
const loading = (btn, on, label) => { btn.disabled = on; if (on) { btn.dataset.l = btn.innerHTML; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${label}`; } else if (btn.dataset.l) btn.innerHTML = btn.dataset.l; };

/* ---------------- دخول ---------------- */
$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#submitBtn");
  $("#err").textContent = "";
  busy = true;
  loading(btn, true, "جاري الدخول...");
  try {
    await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
    location.replace(next);
  } catch (ex) { $("#err").textContent = authMsg(ex); loading(btn, false); busy = false; }
});

/* ---------------- استعادة كلمة المرور ---------------- */
$("#forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#submitBtn");
  $("#err").textContent = "";
  loading(btn, true, "جاري الإرسال...");
  try {
    await sendPasswordResetEmail(auth, $("#email").value.trim());
    $("#sent").hidden = false;
    $("#forgotForm").hidden = true;
  } catch (ex) {
    // لا نكشف هل الإيميل مسجّل أم لا
    if (ex.code === "auth/user-not-found") { $("#sent").hidden = false; $("#forgotForm").hidden = true; }
    else { $("#err").textContent = authMsg(ex); loading(btn, false); }
  }
});

/* ---------------- حساب جديد + OTP ---------------- */
let pending = null; // بيانات الفورم بعد التحقق منها
let cooldown;
function startCooldown(sec = 60) {
  const b = $("#resend");
  clearInterval(cooldown);
  let left = sec;
  const tick = () => { b.disabled = left > 0; b.textContent = left > 0 ? `إعادة إرسال الكود (${left})` : "إعادة إرسال الكود"; if (left-- <= 0) clearInterval(cooldown); };
  tick();
  cooldown = setInterval(tick, 1000);
}
async function sendCode() {
  await api("/otp/send", { email: pending.email, name: pending.name });
  $("#otpEmail").textContent = pending.email;
  $("#step1").hidden = true;
  $("#step2").hidden = false;
  $("#otp").value = "";
  $("#otp").focus();
  startCooldown();
}

$("#signupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#err");
  err.textContent = "";
  const data = {
    name: $("#name").value.trim(),
    phone: digits($("#phone").value),
    email: $("#email").value.trim().toLowerCase(),
    password: $("#password").value,
    marketing: $("#marketing").checked,
  };
  if (data.name.length < 3) return (err.textContent = "اكتب اسمك بالكامل.");
  if (!/^01[0125]\d{8}$/.test(data.phone)) return (err.textContent = "رقم الموبايل غير صحيح — 11 رقم يبدأ بـ 01.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return (err.textContent = "صيغة الإيميل غير صحيحة.");
  if (data.password.length < 8) return (err.textContent = "كلمة المرور لازم تكون 8 أحرف على الأقل.");
  if (!$("#agree").checked) return (err.textContent = "برجاء الموافقة على الشروط والأحكام.");
  pending = data;
  const btn = $("#submitBtn");
  loading(btn, true, "جاري إرسال الكود...");
  try { await sendCode(); }
  catch (ex) { err.textContent = ex.message; }
  finally { loading(btn, false); }
});

$("#resend")?.addEventListener("click", async () => {
  $("#otpErr").textContent = "";
  $("#resend").disabled = true;
  try { await sendCode(); } catch (ex) { $("#otpErr").textContent = ex.message; $("#resend").disabled = false; }
});
$("#editEmail")?.addEventListener("click", () => { $("#step2").hidden = true; $("#step1").hidden = false; });
$("#otp")?.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6)));

$("#otpForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#otpErr");
  err.textContent = "";
  const code = $("#otp").value.trim();
  if (!/^\d{6}$/.test(code)) return (err.textContent = "الكود 6 أرقام.");
  const btn = $("#otpBtn");
  busy = true;
  loading(btn, true, "جاري التأكيد...");
  try {
    await api("/otp/verify", { email: pending.email, code });
    const cred = await createUserWithEmailAndPassword(auth, pending.email, pending.password);
    await updateProfile(cred.user, { displayName: pending.name }).catch(() => {});
    await setDoc(doc(db, "users", cred.user.uid), {
      name: pending.name, phone: pending.phone, email: pending.email, marketing: pending.marketing,
      emailVerified: true, createdAt: serverTimestamp(),
    }, { merge: true });
    location.replace(next);
  } catch (ex) {
    err.textContent = authMsg(ex);
    loading(btn, false);
    busy = false;
  }
});
