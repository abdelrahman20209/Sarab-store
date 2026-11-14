import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, $$, esc, money, STATUS, statusOf, fmtDate, timeAgo, normalizeOrder, waLink, toast, bus, store, openSheet, closeSheets } from "./admin-core.js";
import { STORE_NAME } from "./admin-config.js";

let filter = "all";
let term = "";
let firstLoad = true;
let current = null;

const FILTERS = [
  ["all", "الكل"],
  ["pending", "بانتظار الدفع"],
  ["paid", "مدفوع"],
  ["shipping", "في الشحن"],
  ["delivered", "تم التسليم"],
  ["canceled", "ملغي"],
];
const group = (s) =>
  s === "pending_payment" || s === "pending" ? "pending" : s === "shipped" || s === "on_the_way" ? "shipping" : s;

export function orderRow(o, compact = false) {
  const st = statusOf(o.status);
  const count = o.items.reduce((a, i) => a + Number(i.quantity || 1), 0);
  return `
  <button class="order-card ${compact ? "compact" : ""}" data-id="${esc(o.id)}">
    <div class="oc-ref"><span class="ref">#${esc(o.ref)}</span><small>${esc(timeAgo(o.createdAt) || fmtDate(o.createdAt))}</small></div>
    <div class="oc-cust"><b>${esc(o.name)}</b><small dir="ltr">${esc(o.phone || "—")}</small></div>
    <div class="oc-items">${count} ${count === 1 ? "عطر" : "عطور"}</div>
    <div class="oc-total">${money(o.total)}${o.hasSplit && o.status !== "delivered" && o.status !== "canceled" ? `<small class="muted" style="display: block; font-size: 0.7rem">${o.status === "pending_payment" || o.status === "pending" ? "تحويل " + money(o.payNow) : "عند الاستلام " + money(o.payOnDelivery)}</small>` : ""}</div>
    <div class="oc-status"><span class="pill ${st.tone}">${esc(st.label)}</span></div>
    <i class="fas fa-chevron-left oc-go"></i>
  </button>`;
}

function render() {
  const list = $("#ordersList");
  const rows = store.orders.filter((o) => {
    if (filter !== "all" && group(o.status) !== filter) return false;
    if (!term) return true;
    const hay = `${o.ref} ${o.name} ${o.phone} ${o.altPhone} ${o.zoneName} ${o.address} ${o.email} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase();
    return hay.includes(term);
  });
  list.innerHTML = rows.length
    ? rows.map((o) => orderRow(o)).join("")
    : `<div class="empty"><i class="fas fa-box-open"></i><p>لا توجد طلبات مطابقة</p></div>`;

  // أعداد الفلاتر + شارة التبويب
  const counts = { all: store.orders.length };
  store.orders.forEach((o) => (counts[group(o.status)] = (counts[group(o.status)] || 0) + 1));
  $$("#orderChips .chip").forEach((c) => {
    const n = counts[c.dataset.f] || 0;
    c.querySelector("em").textContent = n;
  });
  const pend = counts.pending || 0;
  $$("[data-badge='orders']").forEach((b) => { b.textContent = pend; b.hidden = !pend; });
}

function openOrder(id) {
  const o = store.orders.find((x) => x.id === id);
  if (!o) return;
  current = o;
  const st = statusOf(o.status);
  const etaDays = (o.eta || "").replace(/\D/g, "");
  const paidUp = ["paid", "shipped", "on_the_way", "delivered"].includes(o.status);
  $("#orderSheetBody").innerHTML = `
    <div class="sheet-head">
      <div><span class="ref big">#${esc(o.ref)}</span><small>${esc(fmtDate(o.createdAt))}</small></div>
      <span class="pill ${st.tone}">${esc(st.label)}</span>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h4><i class="fas fa-user"></i> العميل</h4>
        <dl class="dl">
          <dt>الاسم</dt><dd><b>${esc(o.name)}</b></dd>
          <dt>الموبايل</dt><dd dir="ltr" class="ltr-right">${esc(o.phone || "—")}</dd>
          ${o.altPhone ? `<dt>رقم بديل</dt><dd dir="ltr" class="ltr-right">${esc(o.altPhone)} <a href="tel:${esc(o.altPhone)}" class="link">اتصال</a></dd>` : ""}
          ${o.email ? `<dt>الإيميل</dt><dd dir="ltr" class="ltr-right">${esc(o.email)}</dd>` : ""}
          ${o.zoneName ? `<dt>المنطقة</dt><dd>${esc(o.zoneName)}</dd>` : ""}
          <dt>العنوان</dt><dd>${esc(o.addressDetail || o.address || "لا يوجد عنوان")}</dd>
          ${o.notes ? `<dt>ملاحظات</dt><dd class="gold">${esc(o.notes)}</dd>` : ""}
        </dl>
        <div class="quick">
          ${o.phone ? `<a class="qbtn call" href="tel:${esc(o.phone)}"><i class="fas fa-phone"></i> اتصال</a>
          <a class="qbtn wa" target="_blank" rel="noopener" href="${waLink(o.phone, `أهلاً ${o.name}، معك ${STORE_NAME} بخصوص طلبك #${o.ref}`)}"><i class="fab fa-whatsapp"></i> واتساب</a>
          <a class="qbtn wa" target="_blank" rel="noopener" href="${waLink(o.phone, `أهلاً ${o.name} 🌹\nتم تأكيد استلام تحويلك ${money(o.payNow)} لطلبك #${o.ref} من ${STORE_NAME}.\nجاري تجهيز الطلب وشحنه، والمبلغ المطلوب عند الاستلام: ${money(o.payOnDelivery)}.`)}"><i class="fas fa-check-double"></i> رسالة تأكيد التحويل</a>` : ""}
        </div>
      </div>
      <div class="info-box">
        <h4><i class="fas fa-bag-shopping"></i> المنتجات</h4>
        <ul class="items">
          ${o.items.length ? o.items.map((i) => `
            <li>${i.image ? `<img src="${esc(i.image)}" alt="">` : `<span class="ph"><i class="fas fa-droplet"></i></span>`}
              <div><b>${esc(i.name)}</b><small>× ${esc(i.quantity || 1)}${i.price ? ` · ${money(i.price)}` : ""}</small></div></li>`).join("") : `<li class="muted">لا توجد تفاصيل</li>`}
        </ul>
        ${o.hasSplit ? `
        <div class="sum"><span>سعر المنتجات</span><b>${money(o.subtotal)}</b></div>
        <div class="sum"><span>الشحن${o.zoneName ? ` (${esc(o.zoneName)})` : ""}</span><b>${money(o.shipping)}</b></div>` : ""}
        <div class="sum"><span>إجمالي الطلب</span><b>${money(o.total)}</b></div>
        ${o.hasSplit ? `
        <div class="pay-box">
          <div class="now"><small>${paidUp ? "تم تحويله" : "المطلوب تحويله"}</small><b>${money(o.payNow)}</b><small>شحن ${money(o.shipping)} + مقدّم ${esc(o.depositPct)}%</small></div>
          <div class="cod ${paidUp ? "done" : ""}"><small>${o.status === "delivered" ? "تم تحصيله من المندوب" : "المطلوب عند الوصول"}</small><b>${money(o.payOnDelivery)}</b><small>${paidUp ? "يحصّله المندوب" : "بعد تأكيد التحويل"}</small></div>
        </div>` : ""}
      </div>
    </div>

    <form id="orderForm" class="form">
      <label>حالة الطلب</label>
      <div class="seg" id="statusSeg">
        ${Object.entries(STATUS).filter(([k]) => k !== "pending").map(([k, v]) => `
          <button type="button" class="seg-btn ${o.status === k || (k === "pending_payment" && o.status === "pending") ? "active" : ""}" data-s="${k}">${esc(v.label)}</button>`).join("")}
      </div>
      <label for="etaInput">موعد الوصول (بالأيام)</label>
      <input type="number" id="etaInput" min="0" inputmode="numeric" placeholder="مثال: 3" value="${esc(etaDays)}">
      <button type="submit" class="btn primary block"><i class="fas fa-floppy-disk"></i> حفظ التحديث</button>
    </form>`;

  $("#statusSeg").onclick = (e) => {
    const b = e.target.closest(".seg-btn");
    if (!b) return;
    $$("#statusSeg .seg-btn").forEach((x) => x.classList.toggle("active", x === b));
  };
  $("#orderForm").onsubmit = async (e) => {
    e.preventDefault();
    const s = $("#statusSeg .seg-btn.active")?.dataset.s || o.status;
    const eta = $("#etaInput").value;
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "orders", o.id), { status: s, estimatedArrival: eta ? `${eta} أيام` : "لم يحدد" });
      toast(s === "paid" && o.hasSplit ? `تم تأكيد التحويل — المطلوب عند الوصول ${money(o.payOnDelivery)}` : "تم تحديث الطلب");
      closeSheets();
    } catch (err) {
      console.error(err);
      toast("فشل التحديث: " + err.message, "err");
    } finally { btn.disabled = false; }
  };
  openSheet("orderSheet");
}

export function bindOrderClicks(root) {
  root.addEventListener("click", (e) => {
    const c = e.target.closest(".order-card");
    if (c) openOrder(c.dataset.id);
  });
}

export function initOrders() {
  $("#orderChips").innerHTML = FILTERS.map(([k, l]) => `<button class="chip ${k === "all" ? "active" : ""}" data-f="${k}">${l} <em>0</em></button>`).join("");
  $("#orderChips").onclick = (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    filter = c.dataset.f;
    $$("#orderChips .chip").forEach((x) => x.classList.toggle("active", x === c));
    render();
  };
  $("#orderSearch").oninput = (e) => { term = e.target.value.trim().toLowerCase(); render(); };
  bindOrderClicks($("#ordersList"));

  onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => {
      store.orders = snap.docs.map((d) => normalizeOrder(d.id, d.data()));
      if (!firstLoad) {
        snap.docChanges().forEach((ch) => {
          if (ch.type === "added") toast(`طلب جديد من ${normalizeOrder(ch.doc.id, ch.doc.data()).name}`, "info");
        });
      }
      firstLoad = false;
      render();
      bus.dispatchEvent(new Event("orders"));
    },
    (err) => { console.error(err); toast("تعذر تحميل الطلبات: " + err.message, "err"); $("#ordersList").innerHTML = `<div class="empty"><i class="fas fa-lock"></i><p>لا تملك صلاحية قراءة الطلبات</p></div>`; },
  );
}
