// إدارة أقسام الصفحة الرئيسية (كل قسم = صف منتجات تختارها بنفسك)
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, $$, esc, toast, store, bus, openSheet, closeSheets } from "./admin-core.js";
import { uploadImage } from "./admin-products.js";

let editId = null;
let picked = new Set();
let pickTerm = "";
let secFile = null;
let secImg = "";

function setSecPreview(src) {
  const box = $("#secImgPreview");
  box.innerHTML = src ? `<img src="${esc(src)}" alt="">` : `<i class="fas fa-camera"></i><span>اضغط لاختيار صورة — لو تركتها فارغة تُستخدم صورة أول منتج</span>`;
  box.classList.toggle("has", !!src);
}

const sorted = () => [...store.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

function render() {
  const list = sorted();
  $("#sectionsCount").textContent = list.length;
  $("#sectionsList").innerHTML = list.length
    ? list.map((s, i) => {
        const prods = (s.productIds || []).map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
        return `
    <article class="scard ${s.active === false ? "off" : ""}" data-id="${esc(s.id)}">
      <div class="s-no">${i + 1}</div>
      <div class="s-main">
        <h4>${esc(s.title)}</h4>
        <small class="muted">${esc(s.subtitle || "بدون عنوان فرعي")} · ${prods.length} منتج</small>
        ${prods.length ? "" : `<small class="gold"><i class="fas fa-triangle-exclamation"></i> القسم فارغ — لن يظهر للعملاء حتى تضيف له منتجات</small>`}
        <div class="s-thumbs">${s.image ? `<img src="${esc(s.image)}" alt="" title="صورة القسم" style="outline: 2px solid var(--gold)">` : ""}${prods.slice(0, 5).map((p) => `<img src="${esc(p.image || "")}" alt="">`).join("")}${prods.length > 5 ? `<span>+${prods.length - 5}</span>` : ""}</div>
      </div>
      <div class="s-side">
        <label class="switch" title="ظاهر في الموقع"><input type="checkbox" data-act="toggle" ${s.active === false ? "" : "checked"}><span></span></label>
        <div class="pacts">
          <button class="icon" data-act="up" aria-label="للأعلى" ${i === 0 ? "disabled" : ""}><i class="fas fa-arrow-up"></i></button>
          <button class="icon" data-act="down" aria-label="للأسفل" ${i === list.length - 1 ? "disabled" : ""}><i class="fas fa-arrow-down"></i></button>
          <button class="icon" data-act="edit" aria-label="تعديل"><i class="fas fa-pen"></i></button>
          <button class="icon danger" data-act="del" aria-label="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </article>`;
      }).join("")
    : `<div class="empty"><i class="fas fa-layer-group"></i><p>لا توجد أقسام بعد.<br>أنشئ قسماً مثل "رجالي" أو "التقسيمات" أو "الأكثر مبيعاً" واختر له منتجاته — وسيظهر في كل الموقع.</p></div>`;
}

function renderPicker() {
  const rows = store.products.filter((p) => !pickTerm || (p.name || "").toLowerCase().includes(pickTerm));
  $("#pickCount").textContent = picked.size;
  $("#pickList").innerHTML = rows.length
    ? rows.map((p) => `
    <label class="pick ${picked.has(p.id) ? "on" : ""}">
      <input type="checkbox" value="${esc(p.id)}" ${picked.has(p.id) ? "checked" : ""}>
      <span class="box"></span>
      <img src="${esc(p.image || "")}" alt="">
      <div><b>${esc(p.name)}</b><small class="muted">${Number(p.price || 0).toLocaleString("en-US")} ج.م${p.inStock === false ? " · نفذ" : ""}</small></div>
    </label>`).join("")
    : `<div class="empty small"><p>لا توجد منتجات مطابقة</p></div>`;
}

function openForm(s = null) {
  editId = s?.id || null;
  picked = new Set(s?.productIds || []);
  pickTerm = "";
  $("#secTitle").value = s?.title || "";
  $("#secSub").value = s?.subtitle || "";
  $("#secActive").checked = s ? s.active !== false : true;
  $("#secRail").checked = s ? s.showRail !== false : true;
  secFile = null;
  secImg = s?.image || "";
  $("#secImage").value = "";
  setSecPreview(secImg);
  $("#pickSearch").value = "";
  $("#sectionSheetTitle").textContent = s ? "تعديل القسم" : "قسم جديد";
  renderPicker();
  openSheet("sectionSheet");
}

async function save(e) {
  e.preventDefault();
  const btn = $("#secSave");
  btn.disabled = true;
  try {
    if (secFile) secImg = await uploadImage(secFile);
    const data = {
      title: $("#secTitle").value.trim(),
      subtitle: $("#secSub").value.trim(),
      active: $("#secActive").checked,
      showRail: $("#secRail").checked,
      image: secImg || "",
      productIds: [...picked],
      updatedAt: serverTimestamp(),
    };
    if (editId) await updateDoc(doc(db, "sections", editId), data);
    else {
      data.order = store.sections.length ? Math.max(...store.sections.map((s) => s.order ?? 0)) + 1 : 0;
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "sections"), data);
    }
    toast("تم حفظ القسم — يظهر على الموقع فوراً");
    closeSheets();
  } catch (err) { toast("فشل الحفظ: " + err.message, "err"); }
  finally { btn.disabled = false; }
}

async function move(id, dir) {
  const list = sorted();
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const batch = writeBatch(db);
  list.forEach((s, idx) => batch.update(doc(db, "sections", s.id), { order: idx }));
  try { await batch.commit(); } catch (e) { toast("فشل الترتيب: " + e.message, "err"); }
}

export function initSections() {
  store.sections = [];
  $$("[data-act='add-section']").forEach((b) => (b.onclick = () => openForm()));
  $("#pickSearch").oninput = (e) => { pickTerm = e.target.value.trim().toLowerCase(); renderPicker(); };
  $("#pickList").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    e.target.checked ? picked.add(e.target.value) : picked.delete(e.target.value);
    e.target.closest(".pick").classList.toggle("on", e.target.checked);
    $("#pickCount").textContent = picked.size;
  });
  $("#sectionForm").addEventListener("submit", save);
  $("#secImage").addEventListener("change", (e) => {
    secFile = e.target.files[0] || null;
    if (secFile) setSecPreview(URL.createObjectURL(secFile));
  });

  $("#sectionsList").addEventListener("click", async (e) => {
    const card = e.target.closest(".scard");
    const b = e.target.closest("[data-act]");
    if (!card || !b || b.type === "checkbox") return;
    const s = store.sections.find((x) => x.id === card.dataset.id);
    if (!s) return;
    if (b.dataset.act === "edit") openForm(s);
    if (b.dataset.act === "up") move(s.id, -1);
    if (b.dataset.act === "down") move(s.id, 1);
    if (b.dataset.act === "del") {
      if (!confirm(`حذف قسم "${s.title}"؟ (المنتجات نفسها لن تُحذف)`)) return;
      try { await deleteDoc(doc(db, "sections", s.id)); toast("تم حذف القسم"); } catch (err) { toast(err.message, "err"); }
    }
  });
  $("#sectionsList").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "toggle") return;
    const id = e.target.closest(".scard").dataset.id;
    try { await updateDoc(doc(db, "sections", id), { active: e.target.checked }); toast(e.target.checked ? "القسم ظاهر الآن" : "تم إخفاء القسم"); }
    catch (err) { toast(err.message, "err"); e.target.checked = !e.target.checked; }
  });

  onSnapshot(collection(db, "sections"), (snap) => {
    store.sections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, (err) => { console.error(err); toast("تعذر تحميل الأقسام: " + err.message, "err"); });
  bus.addEventListener("products", () => { render(); });
}
