// الهيدر + الفوتر + شريط الإعلانات + القائمة السفلية — نسخة واحدة لكل الصفحات
import { $, $$, esc, loadSite, loadSections, cartCount, onUser, safeUrl, waLink } from "./core.js";
import { DEFAULTS, DEFAULT_ANNOUNCEMENT } from "../site-schema.js";

let TEXTS = { ...DEFAULTS };
export const T = (k) => (TEXTS[k] != null && TEXTS[k] !== "" ? TEXTS[k] : DEFAULTS[k] ?? "");

function shell(active) {
  const on = (k) => (k === active || (k === "account" && active === "orders") ? ' class="on" aria-current="page"' : "");
  const head = document.createElement("div");
  head.innerHTML = `
  <div class="announce" id="announce" hidden>
    <div class="wrap ann-in">
      <span id="annText"></span><a id="annLink" hidden></a><b id="annTimer" hidden></b>
      <button id="annClose" aria-label="إغلاق"><i class="fas fa-xmark"></i></button>
    </div>
  </div>
  <header class="hdr" id="hdr">
    <div class="wrap hdr-in">
      <a class="brand" href="index.html" aria-label="سراب — الرئيسية"><img data-img="logo" src="${esc(DEFAULTS.logo)}" alt="Sarab" /></a>
      <nav class="hdr-nav" aria-label="القائمة الرئيسية">
        <a href="index.html"${on("home")} data-t="nav_home"></a>
        <div class="dd">
          <button type="button" class="dd-btn" aria-haspopup="true"><span data-t="nav_sections"></span> <i class="fas fa-chevron-down"></i></button>
          <div class="dd-menu" data-sections-menu></div>
        </div>
        <a href="index.html#shop" data-t="nav_all"></a>
        <a href="index.html?s=offers#shop" data-t="nav_offers"></a>
        <a href="account.html#orders"${on("orders")} data-t="nav_orders"></a>
      </nav>
      <div class="hdr-acts">
        <a class="ic-btn" href="index.html?focus=search#shop" aria-label="بحث"><i class="fas fa-magnifying-glass"></i></a>
        <a class="ic-btn desk" id="hdrAccount" href="login.html" aria-label="حسابي"><i class="far fa-user"></i></a>
        <a class="ic-btn cart-btn" href="cart.html" aria-label="السلة"><i class="fas fa-bag-shopping"></i><b data-cart-count hidden>0</b></a>
      </div>
    </div>
  </header>`;
  document.body.prepend(...head.children);

  const foot = document.createElement("div");
  foot.innerHTML = `
  <footer class="ftr">
    <div class="wrap ftr-grid">
      <div class="ftr-brand">
        <img data-img="logo_square" src="${esc(DEFAULTS.logo_square)}" alt="Sarab" loading="lazy" />
        <p data-t="foot_blurb"></p>
        <div class="socials">
          <a data-social="instagram" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a data-social="tiktok" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
          <a data-social="facebook" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a data-wa target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
        </div>
      </div>
      <div>
        <h4 data-t="foot_links_title"></h4>
        <ul>
          <li><a href="index.html#shop" data-t="nav_all"></a></li>
          <li><a href="index.html#how" data-t="hero_btn2"></a></li>
          <li><a href="account.html#orders" data-t="nav_orders"></a></li>
          <li><a href="terms.html" data-t="foot_terms"></a></li>
        </ul>
      </div>
      <div>
        <h4 data-t="foot_contact_title"></h4>
        <ul>
          <li><a data-wa target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> <span dir="ltr" data-wa-num></span></a></li>
          <li><a data-social="email"><i class="far fa-envelope"></i> <span data-t="email"></span></a></li>
        </ul>
      </div>
    </div>
    <div class="wrap ftr-bot"><span>© <span id="yr"></span> <span data-t="brand_name"></span> — <span data-t="foot_copy"></span></span><a href="terms.html" data-t="foot_terms"></a></div>
  </footer>
  <nav class="bnav" aria-label="تنقل سريع">
    <a href="index.html"${on("home")}><i class="fas fa-house"></i><span data-t="nav_home"></span></a>
    <button type="button" id="bnavSections"><i class="fas fa-table-cells-large"></i><span data-t="nav_sections"></span></button>
    <a href="cart.html"${on("cart")}><i class="fas fa-bag-shopping"></i><span data-t="nav_cart"></span><b data-cart-count hidden>0</b></a>
    <a href="account.html" id="bnavAccount"${on("account")}><i class="far fa-user"></i><span data-t="nav_account"></span></a>
  </nav>
  <div class="scrim" id="scrim"></div>
  <section class="sheet" id="sectionsSheet" aria-label="الأقسام">
    <button class="sheet-x" data-close aria-label="إغلاق"><i class="fas fa-xmark"></i></button>
    <h3 data-t="nav_sections"></h3>
    <div class="sec-list" data-sections-menu></div>
  </section>`;
  document.body.append(...foot.children);
  $("#yr").textContent = new Date().getFullYear();
}

export function applyTexts(root = document) {
  $$("[data-t]", root).forEach((el) => (el.textContent = T(el.dataset.t)));
  $$("[data-img]", root).forEach((el) => {
    const v = safeUrl(T(el.dataset.img));
    if (v && el.getAttribute("src") !== v) el.src = v;
  });
  $$("[data-ph]", root).forEach((el) => (el.placeholder = T(el.dataset.ph)));
  const wa = String(T("whatsapp")).replace(/\D/g, "");
  $$("[data-wa]", root).forEach((a) => (a.href = waLink(wa, a.dataset.waText || "")));
  $$("[data-wa-num]", root).forEach((el) => (el.textContent = "+" + wa));
  $$("[data-social]", root).forEach((a) => {
    const k = a.dataset.social;
    if (k === "email") { a.href = `mailto:${T("email")}`; return; }
    const url = safeUrl(TEXTS[k]);
    a.hidden = !url;
    if (url) a.href = url;
  });
}

function paintCart() {
  const n = cartCount();
  $$("[data-cart-count]").forEach((b) => { b.textContent = n; b.hidden = !n; });
}

let annTimer;
function applyAnnouncement(raw) {
  const a = { ...DEFAULT_ANNOUNCEMENT, ...(raw || {}) };
  const bar = $("#announce");
  clearInterval(annTimer);
  const exp = a.expiresAt ? new Date(a.expiresAt) : null;
  const sig = [...(a.text + "|" + (a.expiresAt || ""))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  let closed = false;
  try { closed = sessionStorage.getItem("sarab_ann_" + sig) === "1"; } catch {}
  if (!a.enabled || !a.text || (exp && exp <= new Date()) || closed) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.className = "announce " + (["gold", "black"].includes(a.style) ? a.style : "red");
  $("#annText").textContent = a.text;
  const link = $("#annLink");
  const url = safeUrl(a.link);
  link.hidden = !url;
  if (url) { link.href = url; link.textContent = a.linkText || "اعرف المزيد"; }
  $("#annClose").onclick = () => { bar.hidden = true; try { sessionStorage.setItem("sarab_ann_" + sig, "1"); } catch {} };
  const timer = $("#annTimer");
  timer.hidden = !(a.showCountdown && exp);
  if (a.showCountdown && exp) {
    const p = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = exp - Date.now();
      if (ms <= 0) { bar.hidden = true; clearInterval(annTimer); return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
      timer.textContent = (d ? d + " يوم " : "") + `${p(h)}:${p(m)}:${p(s)}`;
    };
    tick();
    annTimer = setInterval(tick, 1000);
  }
}

export function openSheet(id) {
  $("#" + id)?.classList.add("open");
  $("#scrim").classList.add("open");
  document.body.classList.add("lock");
}
export function closeSheets() {
  $$(".sheet.open").forEach((s) => s.classList.remove("open"));
  $("#scrim").classList.remove("open");
  document.body.classList.remove("lock");
}

function paintSections(sections) {
  const items = [
    ...sections.map((s) => `<a href="index.html?s=${encodeURIComponent(s.id)}#shop">${esc(s.title)}</a>`),
    `<a href="index.html?s=offers#shop" class="offers"><i class="fas fa-tags"></i> ${esc(T("nav_offers"))}</a>`,
    `<a href="index.html#shop">${esc(T("nav_all"))}</a>`,
  ].join("");
  $$("[data-sections-menu]").forEach((m) => (m.innerHTML = items));
}

/** يبني الهيكل المشترك ويرجّع النصوص والأقسام. active: home | cart | account | orders | "" */
export async function initLayout(active = "") {
  shell(active);
  applyTexts();
  paintCart();
  paintSections([]);
  window.addEventListener("cart", paintCart);

  onUser((u) => {
    const href = u ? "account.html" : "login.html";
    $("#hdrAccount").href = href;
    $("#bnavAccount").href = href;
    $("#hdrAccount").classList.toggle("in", !!u);
  });

  $("#bnavSections").onclick = () => openSheet("sectionsSheet");
  $("#scrim").addEventListener("click", closeSheets);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheets(); });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheets());
  const dd = $(".dd");
  $(".dd-btn").onclick = (e) => { e.stopPropagation(); dd.classList.toggle("open"); };
  document.addEventListener("click", () => dd.classList.remove("open"));

  const [site, sections] = await Promise.all([loadSite(), loadSections()]);
  TEXTS = site.texts;
  applyTexts();
  applyAnnouncement(site.announcement);
  paintSections(sections);
  document.body.classList.add("ready");
  return { T, site, sections };
}
