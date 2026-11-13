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
    <div class="oc-total">${money(o.total)}</div>
    <div class="oc-status"><span class="pill ${st.tone}">${esc(st.label)}</span></div>
    <i class="fas fa-chevron-left oc-go"></i>
  </button>`;
}

function render() {
  const list = $("#ordersList");
  const rows = store.orders.filter((o) => {
    if (filter !== "all" && group(o.status) !== filter) return false;
    if (!term) return true;
    const hay = `${o.ref} ${o.name} ${o.phone} ${o.address} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase();
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
  $("#orderSheetBody").innerHTML = `
    <div class="sheet-head">
      <div><span class="ref big">#${esc(o.ref)}</span><small>${esc(fmtDate(o.createdAt))}</small></div>
      <span class="pill ${st.tone}">${esc(st.label)}</span>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h4><i class="fas fa-user"></i> العميل</h4>
        <p><b>${esc(o.name)}</b></p>
        <p dir="ltr" class="ltr-right">${esc(o.phone || "—")}</p>
        <p class="muted">${esc(o.address || "لا يوجد عنوان")}</p>
        <div class="quick">
          ${o.phone ? `<a class="qbtn call" href="tel:${esc(o.phone)}"><i class="fas fa-phone"></i> اتصال</a>
          <a class="qbtn wa" target="_blank" rel="noopener" href="${waLink(o.phone, `أهلاً ${o.name}، معك ${STORE_NAME} بخصوص طلبك #${o.ref}`)}"><i class="fab fa-whatsapp"></i> واتساب</a>` : ""}
        </div>
      </div>
      <div class="info-box">
        <h4><i class="fas fa-bag-shopping"></i> المنتجات</h4>
        <ul class="items">
          ${o.items.length ? o.items.map((i) => `
            <li>${i.image ? `<img src="${esc(i.image)}" alt="">` : `<span class="ph"><i class="fas fa-droplet"></i></span>`}
              <div><b>${esc(i.name)}</b><small>× ${esc(i.quantity || 1)}${i.price ? ` · ${money(i.price)}` : ""}</small></div></li>`).join("") : `<li class="muted">لا توجد تفاصيل</li>`}
        </ul>
        <div class="sum"><span>الإجمالي</span><b>${money(o.total)}</b></div>
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
      toast("تم تحديث الطلب");
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
