import { $, $$, money, store, bus, statusOf, toDate } from "./admin-core.js";
import { orderRow, bindOrderClicks } from "./admin-orders.js";

let range = 7;
const charts = {};
const CONFIRMED = ["paid", "shipped", "on_the_way", "delivered"];

function animate(el, to, suffix = "") {
  if (!el) return;
  const start = performance.now();
  const dur = 900;
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  const step = (t) => {
    const p = Math.min((t - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e).toLocaleString("en-US") + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function chartDefaults() {
  if (!window.Chart) return false;
  Chart.defaults.font.family = '"Tajawal", sans-serif';
  Chart.defaults.color = "#9a958c";
  return true;
}

function series(orders) {
  const map = new Map();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    map.set(d.toDateString(), { d, v: 0 });
  }
  orders.forEach((o) => {
    if (!CONFIRMED.includes(o.status)) return;
    const d = toDate(o.createdAt);
    if (!d) return;
    const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
    if (map.has(k)) map.get(k).v += o.total;
  });
  const arr = [...map.values()];
  return { labels: arr.map((x) => x.d.toLocaleDateString("ar-EG", { day: "numeric", month: range > 7 ? "numeric" : "short" })), values: arr.map((x) => x.v) };
}

function draw(key, canvasId, cfg) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  charts[key]?.destroy();
  charts[key] = new Chart(c.getContext("2d"), cfg);
}

export function renderStats() {
  const orders = store.orders;
  const confirmed = orders.filter((o) => CONFIRMED.includes(o.status));
  const revenue = confirmed.reduce((a, o) => a + o.total, 0);
  const awaiting = orders.filter((o) => o.status === "pending_payment" || o.status === "pending").reduce((a, o) => a + o.total, 0);
  const aov = confirmed.length ? Math.round(revenue / confirmed.length) : 0;
  const customers = new Set(orders.map((o) => o.phone || o.userId || o.id)).size;

  animate($("#kRevenue"), revenue, " ج.م");
  animate($("#kOrders"), orders.length);
  animate($("#kAov"), aov, " ج.م");
  animate($("#kCustomers"), customers);
  $("#kAwaiting").textContent = money(awaiting);

  const today = new Date().toDateString();
  const todayCount = orders.filter((o) => toDate(o.createdAt)?.toDateString() === today).length;
  $("#kToday").textContent = todayCount;

  $("#recentOrders").innerHTML = orders.length
    ? orders.slice(0, 5).map((o) => orderRow(o, true)).join("")
    : `<div class="empty small"><p>لا توجد طلبات بعد</p></div>`;

  if (!chartDefaults()) return;

  const s = series(orders);
  draw("sales", "salesChart", {
    type: "line",
    data: { labels: s.labels, datasets: [{ data: s.values, borderColor: "#e30613", backgroundColor: (ctx) => {
      const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, "rgba(227,6,19,.35)"); g.addColorStop(1, "rgba(227,6,19,0)"); return g; },
      borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: "#fff" }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + money(c.parsed.y) }, rtl: true, backgroundColor: "#121212", borderColor: "#c5a05955", borderWidth: 1, padding: 10 } },
      scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.05)" }, border: { display: false } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } } },
  });

  const counts = {};
  orders.forEach((o) => o.items.forEach((i) => { counts[i.name || "عطر"] = (counts[i.name || "عطر"] || 0) + Number(i.quantity || 1); }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("#topEmpty").hidden = top.length > 0;
  draw("top", "productsPieChart", {
    type: "doughnut",
    data: { labels: top.map((t) => t[0]), datasets: [{ data: top.map((t) => t[1]), backgroundColor: ["#e30613", "#c5a059", "#8e0000", "#f3f0ea", "#555"], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true, padding: 14 } } } },
  });

  const sc = {};
  orders.forEach((o) => { const g = o.status === "pending" ? "pending_payment" : o.status === "on_the_way" ? "shipped" : o.status; sc[g] = (sc[g] || 0) + 1; });
  const keys = ["pending_payment", "paid", "shipped", "delivered", "canceled"];
  draw("status", "orderStatusChart", {
    type: "bar",
    data: { labels: keys.map((k) => statusOf(k).label), datasets: [{ data: keys.map((k) => sc[k] || 0), backgroundColor: ["#e0a82e", "#4aa3ff", "#b07cff", "#3ddc84", "#666"], borderRadius: 8, barThickness: 22 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(255,255,255,.05)" }, border: { display: false } }, x: { grid: { display: false } } } },
  });
}

export function initStats() {
  bindOrderClicks($("#recentOrders"));
  $("#rangeSeg").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    range = Number(b.dataset.r);
    $$("#rangeSeg button").forEach((x) => x.classList.toggle("active", x === b));
    renderStats();
  };
  bus.addEventListener("orders", renderStats);
  window.addEventListener("load", renderStats);
}
