// مناطق التوصيل: لكل منطقة سعر شحن + نسبة المقدّم التي يحوّلها العميل
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, $$, esc, money, toast, store, bus, openSheet, closeSheets } from "./admin-core.js";

let editId = null;
const sorted = () => [...store.zones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name), "ar"));

function example(shipping, pct, base = 1000) {
  const dep = Math.round((base * pct) / 100);
  return `مثال على طلب بـ ${money(base)}: العميل يحوّل <b>${money(shipping + dep)}</b> (شحن ${money(shipping)} + مقدّم ${money(dep)}) ويدفع للمندوب <b>${money(base - dep)}</b>.`;
}

function render() {
  const list = sorted();
  $("#zonesCount").textContent = list.length;
  $("#zonesList").innerHTML = list.length
    ? list.map((z) => `
    <article class="scard ${z.active === false ? "off" : ""}" data-id="${esc(z.id)}">
      <div class="s-no"><i class="fas fa-location-dot"></i></div>
      <div class="s-main">
        <h4>${esc(z.name)}</h4>
        <small class="muted">شحن ${money(z.shipping)} · مقدّم ${esc(z.depositPct || 0)}% من سعر المنتجات</small>
      </div>
      <div class="s-side">
        <label class="switch" title="متاحة للطلب"><input type="checkbox" data-act="toggle" ${z.active === false ? "" : "checked"}><span></span></label>
        <div class="pacts">
          <button class="icon" data-act="edit" aria-label="تعديل"><i class="fas fa-pen"></i></button>
          <button class="icon danger" data-act="del" aria-label="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </article>`).join("")
    : `<div class="empty"><i class="fas fa-map-location-dot"></i><p>لا توجد مناطق بعد.<br>العملاء لن يستطيعوا الطلب حتى تضيف منطقة واحدة على الأقل.</p></div>`;
}

function preview() {
  const s = Math.max(0, Number($("#zShipping").value) || 0);
  const p = Math.min(100, Math.max(0, Number($("#zPct").value) || 0));
  $("#zExample").innerHTML = example(s, p);
}

function openForm(z = null) {
  editId = z?.id || null;
  $("#zoneSheetTitle").textContent = z ? "تعديل المنطقة" : "منطقة جديدة";
  $("#zName").value = z?.name || "";
  $("#zShipping").value = z?.shipping ?? "";
  $("#zPct").value = z?.depositPct ?? 0;
  $("#zActive").checked = z ? z.active !== false : true;
  preview();
  openSheet("zoneSheet");
}

async function save(e) {
  e.preventDefault();
  const name = $("#zName").value.trim();
  const shipping = Number($("#zShipping").value);
  const depositPct = Number($("#zPct").value);
  if (!name) return toast("اكتب اسم المنطقة", "err");
  if (!(shipping >= 0)) return toast("سعر الشحن غير صحيح", "err");
  if (!(depositPct >= 0 && depositPct <= 100)) return toast("نسبة المقدّم بين 0 و 100", "err");
  if (store.zones.some((z) => z.id !== editId && z.name.trim() === name)) return toast("المنطقة موجودة بالفعل", "err");
  const btn = $("#zSave");
  btn.disabled = true;
  try {
    const data = { name, shipping: Math.round(shipping), depositPct, active: $("#zActive").checked, updatedAt: serverTimestamp() };
    if (editId) await updateDoc(doc(db, "zones", editId), data);
    else await addDoc(collection(db, "zones"), { ...data, order: store.zones.length, createdAt: serverTimestamp() });
    toast("تم حفظ المنطقة — تظهر للعملاء فوراً");
    closeSheets();
  } catch (err) { toast("فشل الحفظ: " + err.message, "err"); }
  finally { btn.disabled = false; }
}

export function initZones() {
  $$("[data-act='add-zone']").forEach((b) => (b.onclick = () => openForm()));
  $("#zoneForm").addEventListener("submit", save);
  ["zShipping", "zPct"].forEach((id) => $("#" + id).addEventListener("input", preview));

  $("#zonesList").addEventListener("click", async (e) => {
    const card = e.target.closest(".scard");
    const b = e.target.closest("[data-act]");
    if (!card || !b || b.type === "checkbox") return;
    const z = store.zones.find((x) => x.id === card.dataset.id);
    if (!z) return;
    if (b.dataset.act === "edit") openForm(z);
    if (b.dataset.act === "del") {
      if (!confirm(`حذف منطقة "${z.name}"؟ الطلبات القديمة لن تتأثر.`)) return;
      try { await deleteDoc(doc(db, "zones", z.id)); toast("تم حذف المنطقة"); } catch (err) { toast(err.message, "err"); }
    }
  });
  $("#zonesList").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "toggle") return;
    const id = e.target.closest(".scard").dataset.id;
    try { await updateDoc(doc(db, "zones", id), { active: e.target.checked }); toast(e.target.checked ? "المنطقة متاحة للطلب" : "تم إيقاف المنطقة"); }
    catch (err) { toast(err.message, "err"); e.target.checked = !e.target.checked; }
  });

  onSnapshot(collection(db, "zones"), (snap) => {
    store.zones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
    bus.dispatchEvent(new Event("zones"));
  }, (err) => { console.error(err); toast("تعذر تحميل المناطق: " + err.message, "err"); });
}
