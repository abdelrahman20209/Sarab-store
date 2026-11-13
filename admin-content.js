// محرر محتوى الموقع + شريط الإعلانات
import { doc, getDoc, setDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, $$, esc, toast } from "./admin-core.js";
import { SITE_GROUPS, DEFAULTS, DEFAULT_ANNOUNCEMENT, safeUrl } from "./site-schema.js";
import { uploadImage } from "./admin-products.js";

const ref = doc(db, "settings", "site");
let saved = { texts: {}, images: {}, announcement: null };
const values = {}; // القيم الحالية في الواجهة
let ann = { ...DEFAULT_ANNOUNCEMENT };

const DURATIONS = [
  ["none", "بدون انتهاء (يبقى حتى أوقفه)"],
  ["6", "6 ساعات"], ["12", "12 ساعة"], ["24", "يوم واحد"], ["72", "3 أيام"],
  ["168", "أسبوع"], ["720", "30 يوم"], ["custom", "مدة مخصصة (بالساعات)"],
];

const isImg = (k) => SITE_GROUPS.some((g) => g.fields.some((f) => f.k === k && f.t === "img"));

/* ---------------- شريط الإعلانات ---------------- */
function annStatus() {
  const el = $("#annStatus");
  if (!ann.enabled) { el.innerHTML = `<i class="fas fa-circle-pause"></i> الشريط متوقف حالياً`; el.className = "ann-status off"; return; }
  if (!ann.expiresAt) { el.innerHTML = `<i class="fas fa-circle-play"></i> يعمل الآن بدون موعد انتهاء`; el.className = "ann-status on"; return; }
  const left = new Date(ann.expiresAt) - Date.now();
  if (left <= 0) { el.innerHTML = `<i class="fas fa-clock"></i> انتهت مدة الإعلان وتم إخفاؤه تلقائياً`; el.className = "ann-status off"; return; }
  const h = Math.floor(left / 36e5), d = Math.floor(h / 24);
  const txt = d >= 1 ? `${d} يوم و${h % 24} ساعة` : h >= 1 ? `${h} ساعة و${Math.floor(left / 6e4) % 60} دقيقة` : `${Math.max(1, Math.floor(left / 6e4))} دقيقة`;
  el.innerHTML = `<i class="fas fa-circle-play"></i> يعمل الآن — يختفي تلقائياً بعد <b>${txt}</b> (${new Date(ann.expiresAt).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })})`;
  el.className = "ann-status on";
}

function annPreview() {
  const text = $("#annTextIn").value.trim() || "نص الإعلان يظهر هنا";
  const style = $("#annStyle .seg-btn.active")?.dataset.v || "red";
  const p = $("#annPreview");
  p.className = "ann-preview " + style;
  const link = $("#annLinkIn").value.trim() && ($("#annLinkTextIn").value.trim() || "اعرف المزيد");
  p.innerHTML = `<span>${esc(text)}</span>${link ? `<u>${esc(link)}</u>` : ""}${$("#annCountdown").checked && $("#annDuration").value !== "none" ? `<em>02:15:30</em>` : ""}`;
}

function fillAnn() {
  $("#annEnabled").checked = !!ann.enabled;
  $("#annTextIn").value = ann.text || "";
  $("#annLinkIn").value = ann.link || "";
  $("#annLinkTextIn").value = ann.linkText || "";
  $("#annCountdown").checked = !!ann.showCountdown;
  $$("#annStyle .seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.v === (ann.style || "red")));
  const dl = ann.durationLabel || "none";
  $("#annDuration").value = DURATIONS.some(([v]) => v === dl) ? dl : "custom";
  $("#annCustomWrap").hidden = $("#annDuration").value !== "custom";
  if ($("#annDuration").value === "custom") $("#annCustomHours").value = dl !== "custom" ? dl : "";
  annPreview();
  annStatus();
}

async function publishAnn(stop = false) {
  const btn = stop ? $("#annStop") : $("#annPublish");
  btn.disabled = true;
  try {
    const dur = $("#annDuration").value;
    const hours = dur === "none" ? null : dur === "custom" ? Number($("#annCustomHours").value) : Number(dur);
    if (!stop && !$("#annTextIn").value.trim()) throw new Error("اكتب نص الإعلان أولاً");
    if (!stop && dur === "custom" && !(hours > 0)) throw new Error("أدخل عدد ساعات صحيح");
    const link = $("#annLinkIn").value.trim();
    if (!stop && link && !safeUrl(link)) throw new Error("رابط الإعلان غير صالح");
    ann = {
      enabled: stop ? false : $("#annEnabled").checked,
      text: $("#annTextIn").value.trim(),
      link,
      linkText: $("#annLinkTextIn").value.trim(),
      style: $("#annStyle .seg-btn.active")?.dataset.v || "red",
      showCountdown: $("#annCountdown").checked,
      durationLabel: dur === "custom" ? String(hours || "") : dur,
      expiresAt: stop || !hours ? (stop ? ann.expiresAt || null : null) : new Date(Date.now() + hours * 36e5).toISOString(),
      publishedAt: new Date().toISOString(),
    };
    await setDoc(ref, { announcement: ann }, { merge: true });
    saved.announcement = ann;
    fillAnn();
    toast(stop ? "تم إيقاف الشريط" : "تم نشر الإعلان على الموقع");
  } catch (e) { toast(e.message, "err"); }
  finally { btn.disabled = false; }
}

/* ---------------- نصوص وصور الموقع ---------------- */
function fieldHTML(f) {
  const v = values[f.k] ?? "";
  const mod = v !== f.d ? " mod" : "";
  const head = `<div class="fhead"><label for="cf_${f.k}">${esc(f.l)}</label><button type="button" class="reset" data-reset="${f.k}" title="استعادة الافتراضي" ${mod ? "" : "hidden"}><i class="fas fa-rotate-left"></i></button></div>`;
  if (f.t === "img") {
    return `<div class="field img${mod}" data-k="${f.k}">${head}
      <div class="fimg"><div class="thumb">${v ? `<img src="${esc(v)}" alt="">` : `<i class="fas fa-image"></i>`}</div>
        <div class="fimg-act"><label class="btn ghost small" for="cf_${f.k}"><i class="fas fa-upload"></i> تغيير الصورة</label><input type="file" id="cf_${f.k}" accept="image/*" hidden></div></div></div>`;
  }
  if (f.t === "area") return `<div class="field${mod}" data-k="${f.k}">${head}<textarea id="cf_${f.k}" rows="3">${esc(v)}</textarea></div>`;
  return `<div class="field${mod}" data-k="${f.k}">${head}<input id="cf_${f.k}" type="text" value="${esc(v)}" ${f.t === "url" || f.t === "tel" ? 'dir="ltr"' : ""} placeholder="${esc(f.d)}"></div>`;
}

function renderGroups() {
  $("#contentGroups").innerHTML = SITE_GROUPS.map((g) => `
    <details class="grp">
      <summary><span class="g-ic"><i class="fas ${g.icon}"></i></span><b>${esc(g.title)}</b><em>${g.fields.length}</em><i class="fas fa-chevron-down chev"></i></summary>
      <div class="grp-body">${g.fields.map(fieldHTML).join("")}</div>
    </details>`).join("");
}

function markDirty() {
  const n = Object.keys(values).filter((k) => (values[k] ?? "") !== (savedValue(k) ?? "")).length;
  $("#dirtyCount").textContent = n;
  $("#savebar").classList.toggle("show", n > 0);
}
const savedValue = (k) => saved.texts?.[k] ?? saved.images?.[k] ?? DEFAULTS[k];

function setField(k, v) {
  values[k] = v;
  const box = $(`.field[data-k="${k}"]`);
  if (!box) return;
  const isMod = v !== DEFAULTS[k];
  box.classList.toggle("mod", isMod);
  box.querySelector(".reset").hidden = !isMod;
  markDirty();
}

async function saveContent() {
  const btn = $("#saveContent");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...`;
  try {
    const texts = {}, images = {};
    SITE_GROUPS.forEach((g) => g.fields.forEach((f) => {
      const v = (values[f.k] ?? "").trim();
      const target = f.t === "img" ? images : texts;
      target[f.k] = v && v !== f.d ? v : deleteField();
    }));
    await setDoc(ref, { texts, images, updatedAt: new Date().toISOString() }, { merge: true });
    const snap = await getDoc(ref);
    saved = { texts: {}, images: {}, announcement: null, ...(snap.data() || {}) };
    markDirty();
    toast("تم حفظ التعديلات — ستظهر على الموقع فوراً");
  } catch (e) { console.error(e); toast("فشل الحفظ: " + e.message, "err"); }
  finally { btn.disabled = false; btn.innerHTML = `<i class="fas fa-floppy-disk"></i> حفظ كل التغييرات`; }
}

export async function initContent() {
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) saved = { texts: {}, images: {}, announcement: null, ...snap.data() };
  } catch (e) { toast("تعذر قراءة إعدادات الموقع: " + e.message, "err"); }
  SITE_GROUPS.forEach((g) => g.fields.forEach((f) => (values[f.k] = savedValue(f.k) ?? "")));
  ann = { ...DEFAULT_ANNOUNCEMENT, ...(saved.announcement || {}) };

  $("#annDuration").innerHTML = DURATIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  fillAnn();
  renderGroups();

  ["annTextIn", "annLinkIn", "annLinkTextIn", "annCountdown", "annDuration", "annCustomHours"].forEach((id) =>
    $("#" + id).addEventListener("input", () => { $("#annCustomWrap").hidden = $("#annDuration").value !== "custom"; annPreview(); }));
  $("#annStyle").onclick = (e) => {
    const b = e.target.closest(".seg-btn");
    if (!b) return;
    $$("#annStyle .seg-btn").forEach((x) => x.classList.toggle("active", x === b));
    annPreview();
  };
  $("#annPublish").onclick = () => publishAnn(false);
  $("#annStop").onclick = () => publishAnn(true);
  setInterval(annStatus, 30000);

  const host = $("#contentGroups");
  host.addEventListener("input", (e) => {
    const box = e.target.closest(".field");
    if (box && e.target.matches("input[type=text], textarea")) setField(box.dataset.k, e.target.value);
  });
  host.addEventListener("change", async (e) => {
    const box = e.target.closest(".field.img");
    if (!box || e.target.type !== "file" || !e.target.files[0]) return;
    const k = box.dataset.k;
    const th = box.querySelector(".thumb");
    th.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
      const url = await uploadImage(e.target.files[0]);
      th.innerHTML = `<img src="${esc(url)}" alt="">`;
      setField(k, url);
    } catch (err) { toast(err.message, "err"); th.innerHTML = values[k] ? `<img src="${esc(values[k])}" alt="">` : `<i class="fas fa-image"></i>`; }
  });
  host.addEventListener("click", (e) => {
    const r = e.target.closest("[data-reset]");
    if (!r) return;
    const k = r.dataset.reset;
    const box = $(`.field[data-k="${k}"]`);
    setField(k, DEFAULTS[k]);
    if (box.classList.contains("img")) box.querySelector(".thumb").innerHTML = `<img src="${esc(DEFAULTS[k])}" alt="">`;
    else box.querySelector("input,textarea").value = DEFAULTS[k];
  });
  $("#saveContent").onclick = saveContent;
}
