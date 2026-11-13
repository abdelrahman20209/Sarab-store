import { $, esc, money, store, bus, fmtDate, waLink, toDate } from "./admin-core.js";
import { STORE_NAME } from "./admin-config.js";

let term = "";

function build() {
  const map = new Map();
  store.orders.forEach((o) => {
    const key = o.phone || o.userId || o.name;
    if (!map.has(key)) map.set(key, { name: o.name, phone: o.phone, address: o.address, orders: 0, spent: 0, last: null });
    const c = map.get(key);
    c.orders++;
    if (o.status !== "canceled") c.spent += o.total;
    const d = toDate(o.createdAt);
    if (d && (!c.last || d > c.last)) { c.last = d; c.address = o.address || c.address; c.name = o.name || c.name; }
  });
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

function render() {
  const rows = build().filter((c) => !term || `${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(term));
  $("#customersCount").textContent = rows.length;
  $("#customersList").innerHTML = rows.length
    ? rows.map((c, i) => `
    <div class="cust-card">
      <div class="avatar">${esc((c.name || "؟").trim().charAt(0))}</div>
      <div class="cust-main">
        <b>${esc(c.name)} ${i < 3 && c.spent > 0 ? `<i class="fas fa-crown vip" title="من أفضل العملاء"></i>` : ""}</b>
        <small dir="ltr" class="ltr-right">${esc(c.phone || "—")}</small>
        <small class="muted">${esc(c.address || "")}</small>
      </div>
      <div class="cust-stats"><b>${money(c.spent)}</b><small>${c.orders} ${c.orders === 1 ? "طلب" : "طلبات"} · ${esc(fmtDate(c.last, false))}</small></div>
      ${c.phone ? `<a class="icon wa" target="_blank" rel="noopener" href="${waLink(c.phone, `أهلاً ${c.name}، معك ${STORE_NAME} 🌹`)}" aria-label="واتساب"><i class="fab fa-whatsapp"></i></a>` : ""}
    </div>`).join("")
    : `<div class="empty"><i class="fas fa-users"></i><p>لا يوجد عملاء بعد</p></div>`;
}

export function initCustomers() {
  $("#customerSearch").oninput = (e) => { term = e.target.value.trim().toLowerCase(); render(); };
  bus.addEventListener("orders", render);
}
