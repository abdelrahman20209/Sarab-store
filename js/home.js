// الصفحة الرئيسية: الأقسام + المنتجات + البحث + تفاصيل المنتج
import { $, $$, esc, money, priceOf, loadProducts, addToCart, toast, safeUrl } from "./core.js";
import { initLayout, T, openSheet, closeSheets } from "./layout.js";

const GENDER = { men: "رجالي", women: "حريمي", unisex: "للجنسين" };
let products = [];
let sections = [];
let active = "all"; // all | offers | sectionId
let term = "";

const isOffer = (p) => p.showInOffers || (p.hasDiscount && p.discountPercentage > 0);
const byId = (id) => products.find((p) => p.id === id);
const inSection = (sec) => (sec.productIds || []).map(byId).filter(Boolean);

function card(p) {
  const final = priceOf(p);
  const off = p.hasDiscount && p.discountPercentage > 0;
  const out = p.inStock === false;
  return `
  <article class="pcard ${out ? "out" : ""}" data-id="${esc(p.id)}">
    ${off ? `<span class="badge-off">خصم ${esc(p.discountPercentage)}%</span>` : ""}
    <div class="pimg" data-open><img src="${esc(safeUrl(p.image) || T("cat_fallback_img"))}" alt="${esc(p.name)}" loading="lazy" /></div>
    <div class="pbody">
      <h3 data-open>${esc(p.name)}</h3>
      <small>${esc([GENDER[p.gender], p.size].filter(Boolean).join(" · "))}</small>
      <div class="price"><b>${money(final)}</b>${off ? `<s>${money(p.price)}</s>` : ""}</div>
      <button class="btn ${out ? "ghost" : "primary"} block" data-add ${out ? "disabled" : ""}>
        ${out ? esc(T("txt_out")) : `<i class="fas fa-bag-shopping"></i> ${esc(T("txt_add"))}`}
      </button>
    </div>
  </article>`;
}

function renderChips() {
  const list = [["all", T("chip_all")], ...sections.filter((s) => inSection(s).length).map((s) => [s.id, s.title])];
  if (products.some(isOffer)) list.push(["offers", T("chip_offers")]);
  if (!list.some(([k]) => k === active)) active = "all";
  $("#chips").innerHTML = list.map(([k, l]) => `<button class="chip ${k === active ? "on" : ""}" data-k="${esc(k)}" role="tab">${esc(l)}</button>`).join("");
}

function renderGrid() {
  let rows = products;
  if (active === "offers") rows = rows.filter(isOffer);
  else if (active !== "all") rows = inSection(sections.find((s) => s.id === active) || {});
  if (term) rows = rows.filter((p) => `${p.name} ${p.description || ""}`.toLowerCase().includes(term));
  // المتوفر أولاً
  rows = [...rows].sort((a, b) => (a.inStock === false) - (b.inStock === false));
  $("#grid").innerHTML = rows.length
    ? rows.map(card).join("")
    : `<div class="empty"><i class="fas fa-droplet"></i><p>${esc(T("empty_products"))}</p>${term || active !== "all" ? `<button class="btn ghost sm" id="clearFilters">عرض كل العطور</button>` : ""}</div>`;
}

function renderSections() {
  const withItems = sections.map((s) => ({ s, items: inSection(s) })).filter((x) => x.items.length);
  $("#sections").hidden = !withItems.length;
  $("#tiles").innerHTML = withItems.map(({ s, items }) => `
    <a class="tile" href="?s=${encodeURIComponent(s.id)}#shop" data-sec="${esc(s.id)}">
      <img src="${esc(safeUrl(s.image) || safeUrl(items[0].image) || T("cat_fallback_img"))}" alt="" loading="lazy" />
      <b>${esc(s.title)}<small>${items.length} ${items.length > 10 ? "عطر" : items.length > 2 ? "عطور" : "عطر"}</small></b>
    </a>`).join("");

  $("#rails").innerHTML = withItems.filter(({ s }) => s.showRail !== false).map(({ s, items }) => `
    <section class="sec" style="padding-block: 28px">
      <div class="wrap">
        <div class="rail-head">
          <div>${s.subtitle ? `<div class="kicker">${esc(s.subtitle)}</div>` : ""}<h2>${esc(s.title)}</h2></div>
          <a class="link" href="?s=${encodeURIComponent(s.id)}#shop" data-sec="${esc(s.id)}">عرض الكل</a>
        </div>
        <div class="rail">${items.slice(0, 12).map(card).join("")}</div>
      </div>
    </section>`).join("");
}

function setActive(k, scroll = false) {
  active = k;
  renderChips();
  renderGrid();
  if (scroll) $("#shop").scrollIntoView({ behavior: "smooth" });
}

/* ---------- تفاصيل المنتج ---------- */
function openProduct(id) {
  const p = byId(id);
  if (!p) return;
  const final = priceOf(p);
  const off = p.hasDiscount && p.discountPercentage > 0;
  const out = p.inStock === false;
  let qty = 1;
  $("#pv").innerHTML = `
    <div class="pv">
      <div class="pv-img"><img src="${esc(safeUrl(p.image) || T("cat_fallback_img"))}" alt="${esc(p.name)}" /></div>
      <div style="display: grid; gap: 12px">
        <h3>${esc(p.name)}</h3>
        <div class="tags">
          ${GENDER[p.gender] ? `<span class="tag">${GENDER[p.gender]}</span>` : ""}
          ${p.size ? `<span class="tag">${esc(p.size)}</span>` : ""}
          <span class="tag ${out ? "bad" : "ok"}">${esc(out ? T("txt_out") : T("txt_in"))}</span>
        </div>
        <div class="price"><b style="font-size: 1.5rem">${money(final)}</b>${off ? `<s>${money(p.price)}</s> <span class="tag bad">خصم ${esc(p.discountPercentage)}%</span>` : ""}</div>
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
        ${out ? "" : `
        <div style="display: flex; align-items: center; gap: 12px"><span class="muted">الكمية</span>
          <div class="qty"><button type="button" data-q="-1" aria-label="أقل">−</button><span id="pvQty">1</span><button type="button" data-q="1" aria-label="أكثر">+</button></div>
        </div>
        <div class="pv-buy">
          <button class="btn ghost" id="pvAdd"><i class="fas fa-bag-shopping"></i> ${esc(T("txt_add"))}</button>
          <button class="btn primary" id="pvBuy">${esc(T("txt_buy"))} <i class="fas fa-arrow-left"></i></button>
        </div>`}
        <p class="muted" style="font-size: 0.85rem"><i class="fas fa-hand-holding-dollar gold"></i> ${esc(T("hero_point2"))} · <i class="fas fa-truck-fast gold"></i> ${esc(T("hero_point1"))}</p>
      </div>
    </div>`;
  $$("#pv [data-q]").forEach((b) => (b.onclick = () => { qty = Math.min(20, Math.max(1, qty + Number(b.dataset.q))); $("#pvQty").textContent = qty; }));
  if (!out) {
    $("#pvAdd").onclick = () => { addToCart(p.id, p, qty); toast(`تمت إضافة «${p.name}» للسلة`); closeSheets(); };
    $("#pvBuy").onclick = () => { addToCart(p.id, p, qty); location.href = "cart.html"; };
  }
  openSheet("productSheet");
}

/* ---------- التشغيل ---------- */
const layout = initLayout("home");

document.addEventListener("click", (e) => {
  const cardEl = e.target.closest(".pcard");
  if (cardEl && e.target.closest("[data-add]")) {
    const p = byId(cardEl.dataset.id);
    if (p) { addToCart(p.id, p, 1); toast(`تمت إضافة «${p.name}» للسلة`); }
    return;
  }
  if (cardEl && e.target.closest("[data-open]")) return openProduct(cardEl.dataset.id);
  const chip = e.target.closest(".chip");
  if (chip) return setActive(chip.dataset.k);
  const sec = e.target.closest("[data-sec]");
  if (sec) { e.preventDefault(); history.replaceState(null, "", `?s=${encodeURIComponent(sec.dataset.sec)}#shop`); return setActive(sec.dataset.sec, true); }
  if (e.target.closest("#clearFilters")) { term = ""; $("#q").value = ""; setActive("all"); }
});
$("#q").addEventListener("input", (e) => { term = e.target.value.trim().toLowerCase(); renderGrid(); });

(async () => {
  const [{ sections: secs }, prods] = await Promise.all([
    layout,
    loadProducts().catch((e) => { console.error(e); return null; }),
  ]);
  if (!prods) {
    $("#grid").innerHTML = `<div class="empty"><i class="fas fa-triangle-exclamation"></i><p>تعذّر تحميل العطور. تأكد من الإنترنت ثم أعد المحاولة.</p><button class="btn ghost sm" onclick="location.reload()">إعادة المحاولة</button></div>`;
    return;
  }
  products = prods;
  sections = secs;
  const qs = new URLSearchParams(location.search);
  const s = qs.get("s");
  if (s && (s === "offers" || sections.some((x) => x.id === s))) active = s;
  renderSections();
  renderChips();
  renderGrid();
  if (location.hash === "#shop" || s) requestAnimationFrame(() => $("#shop").scrollIntoView());
  if (qs.get("focus") === "search") $("#q").focus({ preventScroll: true });
  const pid = qs.get("p");
  if (pid) openProduct(pid);
})();
