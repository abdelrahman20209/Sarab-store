// صفحة الحساب: طلباتي + بياناتي وعنواني + الأمان
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { $, $$, esc, money, db, auth, whenUser, loadZones, statusOf, fmtDate, toDate, toast, authMsg } from "./core.js";
import { initLayout } from "./layout.js";

const user = await whenUser();
if (!user) location.replace("login.html?next=account.html");

const TABS = ["orders", "profile", "security"];
function showTab(t) {
  if (!TABS.includes(t)) t = "orders";
  TABS.forEach((k) => ($("#tab-" + k).hidden = k !== t));
  $$(".acc-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  history.replaceState(null, "", "#" + t);
}
$$(".acc-tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

const digits = (v) => String(v || "").replace(/[^\d]/g, "").replace(/^(?:0020|20)(?=1)/, "0");
const phoneOk = (v) => /^01[0125]\d{8}$/.test(v);

async function loadOrders() {
  const host = $("#ordersList");
  try {
    const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", user.uid)));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0));
    host.innerHTML = rows.length
      ? `<div class="card">${rows.map((o) => {
          const st = statusOf(o.status);
          const n = (o.cartItems || []).reduce((a, i) => a + Number(i.quantity || 1), 0);
          return `
          <a class="orow" href="order.html?id=${encodeURIComponent(o.id)}">
            <div><b class="ltr">#${esc(o.referenceCode || o.id.slice(0, 6))}</b> <small>· ${n} قطعة</small><br /><small>${esc(fmtDate(o.createdAt))}</small></div>
            <div style="text-align: left"><span class="pill ${st.tone}">${esc(st.label)}</span><div class="amt">${money(o.totalPrice)}</div></div>
          </a>`;
        }).join("")}</div>`
      : `<div class="card"><div class="empty"><i class="fas fa-box-open"></i><p>لسه ما عملتش أي طلب.</p><a class="btn primary" href="index.html#shop">تسوّق الآن</a></div></div>`;
  } catch (e) {
    console.error(e);
    host.innerHTML = `<div class="card"><div class="empty"><i class="fas fa-triangle-exclamation"></i><p>تعذّر تحميل الطلبات. أعد المحاولة.</p></div></div>`;
  }
}

async function loadProfile() {
  const [snap, zones] = await Promise.all([
    getDoc(doc(db, "users", user.uid)).catch(() => null),
    loadZones().catch(() => []),
  ]);
  const p = snap?.exists() ? snap.data() : {};
  const name = p.name || user.displayName || "";
  $("#hello").textContent = name ? `أهلاً، ${name}` : "حسابي";
  $("#avatar").textContent = (name || user.email || "س").trim().charAt(0).toUpperCase();
  $("#helloEmail").textContent = user.email || "";
  $("#pName").value = name;
  $("#pPhone").value = p.phone || "";
  $("#pAlt").value = p.altPhone || "";
  $("#pAddress").value = p.address || "";
  $("#pMarketing").checked = p.marketing !== false;
  $("#pZone").innerHTML = `<option value="">— اختَر المنطقة —</option>` + zones.map((z) => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join("");
  if (p.zoneId && zones.some((z) => z.id === p.zoneId)) $("#pZone").value = p.zoneId;

  $("#profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const err = $("#pErr");
    err.textContent = "";
    const phone = digits($("#pPhone").value), alt = digits($("#pAlt").value);
    if (phone && !phoneOk(phone)) return (err.textContent = "رقم الموبايل غير صحيح — 11 رقم يبدأ بـ 01.");
    if (alt && !phoneOk(alt)) return (err.textContent = "الرقم البديل غير صحيح.");
    const z = zones.find((x) => x.id === $("#pZone").value);
    const btn = $("#pSave");
    btn.disabled = true;
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: $("#pName").value.trim(), phone, altPhone: alt, address: $("#pAddress").value.trim(),
        zoneId: z?.id || "", zoneName: z?.name || "", marketing: $("#pMarketing").checked, email: user.email || "",
      }, { merge: true });
      $("#hello").textContent = `أهلاً، ${$("#pName").value.trim()}`;
      toast("تم حفظ بياناتك");
    } catch (ex) { err.textContent = "تعذّر الحفظ، حاول مرة أخرى."; }
    finally { btn.disabled = false; }
  };
}

$("#resetBtn").onclick = async (e) => {
  e.currentTarget.disabled = true;
  try { await sendPasswordResetEmail(auth, user.email); toast("تم إرسال الرابط إلى بريدك"); }
  catch (ex) { toast(authMsg(ex), "err"); e.currentTarget.disabled = false; }
};
$("#logoutBtn").onclick = async () => { await signOut(auth); location.href = "index.html"; };

if (user) {
  initLayout(location.hash === "#orders" || !location.hash ? "orders" : "account");
  showTab(location.hash.slice(1));
  loadOrders();
  loadProfile();
}
