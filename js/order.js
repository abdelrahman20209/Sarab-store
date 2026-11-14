// صفحة الطلب: تعليمات التحويل + إرسال الإثبات واتساب + الفاتورة + متابعة الحالة لحظياً
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { $, esc, money, db, whenUser, statusOf, fmtDate, waLink, toast } from "./core.js";
import { initLayout, T } from "./layout.js";

const qs = new URLSearchParams(location.search);
const id = qs.get("id") || "";
const isNew = qs.get("new") === "1";

const user = await whenUser();
if (!user) location.replace(`login.html?next=${encodeURIComponent("order.html?id=" + id)}`);
const { site } = await initLayout("orders");
$("#progress").hidden = !isNew;

const fail = (msg) => ($("#view").innerHTML = `<div class="card"><div class="empty"><i class="fas fa-box-open"></i><p>${esc(msg)}</p><a class="btn ghost sm" href="account.html#orders">طلباتي</a></div></div>`);

function waText(o) {
  const lines = [
    `طلب من ${T("brand_name")} 🧾`,
    `رقم الطلب: #${o.referenceCode}`,
    `الاسم: ${o.customerName}`,
    `الموبايل: ${o.customerPhone}${o.altPhone ? ` — بديل: ${o.altPhone}` : ""}`,
    `العنوان: ${o.address}`,
    ``,
    `المنتجات:`,
    ...(o.cartItems || []).map((i) => `• ${i.name} × ${i.quantity} = ${money(i.price * i.quantity)}`),
    ``,
    `سعر المنتجات: ${money(o.subtotal)}`,
    `الشحن: ${money(o.shipping)}`,
    `إجمالي الطلب: ${money(o.totalPrice)}`,
    `✅ تم تحويل: ${money(o.payNow)}`,
    `💵 الباقي عند الاستلام: ${money(o.payOnDelivery)}`,
    ``,
    `مرفق صورة التحويل.`,
  ];
  return lines.join("\n");
}

function render(o) {
  const st = statusOf(o.status);
  const pending = o.status === "pending_payment" || o.status === "pending";
  const canceled = o.status === "canceled";
  const methods = (site.shop.payMethods || []).filter((m) => m && m.value);
  const wa = waLink(T("whatsapp"), waText(o));
  const steps = ["تأكيد التحويل", "تجهيز الطلب", "الشحن", "الاستلام"];

  $("#view").innerHTML = `
    <div class="card">
      <div class="order-top">
        <div><small class="muted">رقم الطلب</small><div class="ref ltr">#${esc(o.referenceCode || id.slice(0, 6))}</div><small class="muted">${esc(fmtDate(o.createdAt))}</small></div>
        <span class="pill ${st.tone}">${esc(st.label)}</span>
      </div>
      ${canceled ? "" : `<ol class="tl" style="margin-top: 18px">${steps.map((s, i) => `<li class="${st.step > i || (st.step === 3 && i === 3) ? "on" : ""}">${s}</li>`).join("")}</ol>`}
      ${o.estimatedArrival && !pending && !canceled && o.estimatedArrival !== "لم يحدد" ? `<p class="note"><i class="fas fa-truck-fast"></i><span>موعد الوصول المتوقع: خلال ${esc(o.estimatedArrival)}</span></p>` : ""}
    </div>

    ${pending ? `
    <div class="card no-print">
      <h2><i class="fas fa-list-check"></i> ${isNew ? "تم تسجيل طلبك — فاضل خطوتين" : "طلبك بانتظار التحويل"}</h2>
      <ol class="todo">
        <li><div>
          <h3>حوِّل المبلغ ده</h3>
          <div class="amount">${money(o.payNow)}</div>
          <p class="muted" style="font-size: 0.85rem">الشحن ${money(o.shipping)}${o.deposit ? ` + مقدّم ${esc(o.depositPct)}% (${money(o.deposit)})` : ""}</p>
          ${methods.length ? methods.map((m) => `
            <div class="pm"><div><small>${esc(m.name || "وسيلة الدفع")}</small><b class="ltr">${esc(m.value)}</b></div>
            <button type="button" class="btn ghost sm" data-copy="${esc(m.value)}"><i class="far fa-copy"></i> نسخ</button></div>`).join("")
            : `<p class="note"><i class="fas fa-circle-info"></i><span>هنبعت لك بيانات التحويل على واتساب — اضغط الزر في الخطوة التالية.</span></p>`}
        </div></li>
        <li><div>
          <h3>ابعت صورة التحويل على واتساب</h3>
          <p>${esc(T("pay_after"))}</p>
          <a class="btn wa block" href="${esc(wa)}" target="_blank" rel="noopener" style="margin-top: 10px"><i class="fab fa-whatsapp"></i> إرسال الفاتورة وصورة التحويل</a>
          <p class="muted" style="font-size: 0.82rem; margin-top: 6px">الزر بيفتح واتساب والفاتورة مكتوبة جاهزة — أرفق سكرين شوت التحويل واضغط إرسال.</p>
        </div></li>
        <li><div><h3>استنى التأكيد</h3><p>هنراجع التحويل ونأكد طلبك، وحالة الطلب هتتغيّر هنا تلقائياً. الباقي <b class="gold">${money(o.payOnDelivery)}</b> تدفعه للمندوب عند الاستلام.</p></div></li>
      </ol>
    </div>` : ""}

    ${canceled ? `<div class="card"><p class="note bad"><i class="fas fa-circle-xmark"></i><span>تم إلغاء هذا الطلب. لو عندك استفسار تواصل معنا على واتساب.</span></p></div>` : ""}

    <div class="two" style="margin-top: 14px">
      <div class="card">
        <h2><i class="fas fa-file-invoice"></i> الفاتورة</h2>
        <ul class="inv-items">${(o.cartItems || []).map((i) => `<li><span>${esc(i.name)} × ${esc(i.quantity)}</span><span>${money(i.price * i.quantity)}</span></li>`).join("")}</ul>
        <div class="inv-row" style="border-top: 1px solid var(--line); margin-top: 8px; padding-top: 12px"><span>سعر المنتجات</span><b>${money(o.subtotal)}</b></div>
        <div class="inv-row"><span>الشحن <small class="muted">(${esc(o.zoneName || "")})</small></span><b>${money(o.shipping)}</b></div>
        <div class="inv-row total"><span>إجمالي الطلب</span><b>${money(o.totalPrice)}</b></div>
        <div class="split">
          <div class="now"><small>${pending ? "المطلوب تحويله الآن" : "المدفوع بالتحويل"}</small><b>${money(o.payNow)}</b></div>
          <div class="later"><small>${o.status === "delivered" ? "دُفع عند الاستلام" : "الباقي عند الاستلام"}</small><b>${money(o.payOnDelivery)}</b></div>
        </div>
      </div>
      <aside>
        <div class="card">
          <h2><i class="fas fa-truck"></i> بيانات التوصيل</h2>
          <dl class="kv">
            <dt>المستلم</dt><dd>${esc(o.customerName)}</dd>
            <dt>الموبايل</dt><dd class="ltr" style="text-align: right">${esc(o.customerPhone)}</dd>
            ${o.altPhone ? `<dt>رقم بديل</dt><dd class="ltr" style="text-align: right">${esc(o.altPhone)}</dd>` : ""}
            <dt>المنطقة</dt><dd>${esc(o.zoneName || "—")}</dd>
            <dt>العنوان</dt><dd>${esc(o.addressDetail || o.address || "—")}</dd>
            ${o.notes ? `<dt>ملاحظات</dt><dd>${esc(o.notes)}</dd>` : ""}
          </dl>
        </div>
        <div class="card no-print" style="display: grid; gap: 10px">
          <button class="btn ghost block" type="button" id="printBtn"><i class="fas fa-print"></i> طباعة / حفظ الفاتورة</button>
          <a class="btn ghost block" data-wa data-wa-text="أهلاً، عندي استفسار بخصوص الطلب #${esc(o.referenceCode)}" href="${esc(waLink(T("whatsapp"), `أهلاً، عندي استفسار بخصوص الطلب #${o.referenceCode}`))}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> تواصل مع الدعم</a>
          <a class="btn ghost block" href="account.html#orders"><i class="fas fa-box"></i> كل طلباتي</a>
        </div>
      </aside>
    </div>`;
  $("#printBtn").onclick = () => window.print();
  document.title = `طلب #${o.referenceCode} | ${T("brand_name")}`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); toast("تم نسخ الرقم"); }
  catch { toast("انسخ الرقم يدوياً", "err"); }
});

if (user) {
  if (!id) fail("رابط الطلب غير صحيح.");
  else onSnapshot(doc(db, "orders", id),
    (snap) => (snap.exists() ? render(snap.data()) : fail("الطلب غير موجود.")),
    () => fail("لا يمكن عرض هذا الطلب — تأكد أنك مسجّل بنفس الحساب الذي طلب به."));
}
