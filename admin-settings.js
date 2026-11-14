// إعدادات الدفع (أرقام التحويل) + الشروط والأحكام
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, esc, toast } from "./admin-core.js";
import { DEFAULT_TERMS } from "./site-schema.js";

const shopRef = doc(db, "settings", "shop");
const termsRef = doc(db, "settings", "terms");
let methods = [];

function renderMethods() {
  $("#payMethods").innerHTML = methods.length
    ? methods.map((m, i) => `
    <div class="row2 pm-row" data-i="${i}">
      <div><label>اسم الوسيلة</label><input type="text" data-f="name" value="${esc(m.name)}" placeholder="مثال: فودافون كاش / إنستاباي"></div>
      <div><label>الرقم / العنوان</label>
        <div style="display: flex; gap: 8px"><input type="text" data-f="value" dir="ltr" value="${esc(m.value)}" placeholder="010xxxxxxxx">
        <button type="button" class="icon danger" data-rm aria-label="حذف"><i class="fas fa-trash"></i></button></div></div>
    </div>`).join("")
    : `<p class="muted">لا توجد وسائل تحويل. أضف رقم فودافون كاش أو إنستاباي ليظهر للعميل بعد تأكيد الطلب.</p>`;
}

export async function initSettings() {
  try {
    const [shop, terms] = await Promise.all([getDoc(shopRef), getDoc(termsRef)]);
    methods = (shop.exists() ? shop.data().payMethods : null) || [];
    $("#termsText").value = (terms.exists() && terms.data().text) || DEFAULT_TERMS;
  } catch (e) { toast("تعذر قراءة الإعدادات: " + e.message, "err"); $("#termsText").value = DEFAULT_TERMS; }
  renderMethods();

  $("#addPayMethod").onclick = () => { methods.push({ name: "", value: "" }); renderMethods(); };
  $("#payMethods").addEventListener("input", (e) => {
    const row = e.target.closest(".pm-row");
    if (row && e.target.dataset.f) methods[row.dataset.i][e.target.dataset.f] = e.target.value;
  });
  $("#payMethods").addEventListener("click", (e) => {
    const row = e.target.closest(".pm-row");
    if (row && e.target.closest("[data-rm]")) { methods.splice(Number(row.dataset.i), 1); renderMethods(); }
  });
  $("#savePay").onclick = async (e) => {
    const btn = e.currentTarget;
    const clean = methods.map((m) => ({ name: m.name.trim(), value: m.value.trim() })).filter((m) => m.value);
    btn.disabled = true;
    try { await setDoc(shopRef, { payMethods: clean, updatedAt: new Date().toISOString() }, { merge: true }); methods = clean; renderMethods(); toast("تم حفظ وسائل التحويل"); }
    catch (err) { toast("فشل الحفظ: " + err.message, "err"); }
    finally { btn.disabled = false; }
  };

  $("#saveTerms").onclick = async (e) => {
    const btn = e.currentTarget;
    const text = $("#termsText").value.trim();
    if (text.length < 50) return toast("نص الشروط قصير جداً", "err");
    btn.disabled = true;
    try { await setDoc(termsRef, { text, updatedAt: new Date().toISOString() }); toast("تم حفظ الشروط — تظهر في الموقع فوراً"); }
    catch (err) { toast("فشل الحفظ: " + err.message, "err"); }
    finally { btn.disabled = false; }
  };
  $("#resetTerms").onclick = () => { if (confirm("استعادة النص الافتراضي؟ (لن يُحفظ حتى تضغط حفظ)")) $("#termsText").value = DEFAULT_TERMS; };
}
