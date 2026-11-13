import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, $, $$, esc, money, toast, bus, store, openSheet, closeSheets } from "./admin-core.js";
import { IMGBB_API_KEY } from "./admin-config.js";

let term = "";
let editId = null;
let pendingFile = null;

const GENDER = { men: "رجالي", women: "حريمي", unisex: "للجنسين" };
const finalPrice = (p) => (p.hasDiscount ? p.price - p.price * ((p.discountPercentage || 0) / 100) : p.price);

function render() {
  const grid = $("#productsGrid");
  const rows = store.products.filter((p) => !term || `${p.name} ${p.description || ""}`.toLowerCase().includes(term));
  $("#productsCount").textContent = store.products.length;
  grid.innerHTML = rows.length
    ? rows.map((p) => `
    <article class="pcard ${p.inStock ? "" : "out"}" data-id="${esc(p.id)}">
      <div class="pimg">
        ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : `<i class="fas fa-droplet"></i>`}
        <div class="ptags">
          ${p.hasDiscount ? `<span class="tag red">خصم ${esc(p.discountPercentage)}%</span>` : ""}
          ${p.showInOffers ? `<span class="tag gold">عروض</span>` : ""}
          ${p.showInStore === false ? `<span class="tag mute">مخفي</span>` : ""}
        </div>
      </div>
      <div class="pbody">
        <h4>${esc(p.name)}</h4>
        <div class="pprice"><b>${money(finalPrice(p))}</b>${p.hasDiscount ? `<s>${money(p.price)}</s>` : ""}</div>
        <small class="muted">${esc(GENDER[p.gender] || "للجنسين")}${p.size ? " · " + esc(p.size) : ""}${p.stockCount != null ? ` · مخزون ${esc(p.stockCount)}` : ""}</small>
        <div class="pfoot">
          <label class="switch" title="متوفر"><input type="checkbox" data-act="stock" ${p.inStock ? "checked" : ""}><span></span><em>${p.inStock ? "متوفر" : "نفذ"}</em></label>
          <div class="pacts">
            <button class="icon" data-act="edit" aria-label="تعديل"><i class="fas fa-pen"></i></button>
            <button class="icon danger" data-act="del" aria-label="حذف"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    </article>`).join("")
    : `<div class="empty"><i class="fas fa-droplet"></i><p>لا توجد منتجات${term ? " مطابقة" : " بعد — أضف أول عطر"}</p></div>`;
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "فشل رفع الصورة");
  return data.data.url;
}

function updatePreview() {
  const price = parseFloat($("#prodPrice").value) || 0;
  const disc = parseFloat($("#prodDiscount").value) || 0;
  const on = $("#hasDiscount").value === "yes";
  $("#discountSection").hidden = !on;
  $("#pricePreview").textContent = on && disc > 0 ? `السعر بعد الخصم: ${money(price - price * (disc / 100))}` : "";
}

function setImagePreview(src) {
  const box = $("#imgPreview");
  box.innerHTML = src ? `<img src="${esc(src)}" alt="">` : `<i class="fas fa-camera"></i><span>اضغط لاختيار صورة العطر</span>`;
  box.classList.toggle("has", !!src);
}

function openForm(p = null) {
  editId = p?.id || null;
  pendingFile = null;
  const f = $("#productForm");
  f.reset();
  $("#prodImage").value = "";
  $("#productSheetTitle").textContent = p ? "تعديل العطر" : "إضافة عطر جديد";
  $("#addBtn").innerHTML = p ? `<i class="fas fa-floppy-disk"></i> حفظ التعديلات` : `<i class="fas fa-plus"></i> إضافة المنتج`;
  if (p) {
    $("#prodName").value = p.name || "";
    $("#prodPrice").value = p.price ?? "";
    $("#hasDiscount").value = p.hasDiscount ? "yes" : "no";
    $("#prodDiscount").value = p.discountPercentage ?? 0;
    $("#showInStore").checked = p.showInStore !== false;
    $("#showInOffers").checked = !!p.showInOffers;
    $("#prodStatus").value = String(p.inStock !== false);
    $("#prodStock").value = p.stockCount ?? 0;
    $("#prodGender").value = p.gender || "unisex";
    $("#prodDescription").value = p.description || "";
    $("#prodSize").value = p.size || "";
  }
  setImagePreview(p?.image || "");
  updatePreview();
  openSheet("productSheet");
}

async function save(e) {
  e.preventDefault();
  const btn = $("#addBtn");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...`;
  try {
    let image = null;
    if (pendingFile) image = await uploadImage(pendingFile);
    if (!editId && !image) throw new Error("اختر صورة للمنتج الجديد");

    const data = {
      name: $("#prodName").value.trim(),
      price: parseFloat($("#prodPrice").value),
      hasDiscount: $("#hasDiscount").value === "yes",
      discountPercentage: parseFloat($("#prodDiscount").value) || 0,
      showInStore: $("#showInStore").checked,
      showInOffers: $("#showInOffers").checked,
      inStock: $("#prodStatus").value === "true",
      stockCount: parseInt($("#prodStock").value) || 0,
      gender: $("#prodGender").value,
      description: $("#prodDescription").value.trim(),
      size: $("#prodSize").value.trim(),
      updatedAt: serverTimestamp(),
    };
    if (image) data.image = image;

    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      toast("تم تحديث العطر");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
      toast("تمت إضافة العطر");
    }
    closeSheets();
  } catch (err) {
    console.error(err);
    toast(err.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

export function initProducts() {
  $("#productSearch").oninput = (e) => { term = e.target.value.trim().toLowerCase(); render(); };
  $$("[data-act='add-product']").forEach((b) => (b.onclick = () => openForm()));

  $("#productsGrid").addEventListener("click", async (e) => {
    const card = e.target.closest(".pcard");
    const btn = e.target.closest("[data-act]");
    if (!card || !btn) return;
    const p = store.products.find((x) => x.id === card.dataset.id);
    if (!p) return;
    if (btn.dataset.act === "edit") openForm(p);
    if (btn.dataset.act === "del") {
      if (!confirm(`حذف "${p.name}" نهائياً؟ لا يمكن التراجع.`)) return;
      try { await deleteDoc(doc(db, "products", p.id)); toast("تم حذف العطر"); }
      catch (err) { toast("فشل الحذف: " + err.message, "err"); }
    }
  });
  $("#productsGrid").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "stock") return;
    const id = e.target.closest(".pcard").dataset.id;
    try { await updateDoc(doc(db, "products", id), { inStock: e.target.checked, updatedAt: serverTimestamp() }); toast(e.target.checked ? "أصبح متوفراً" : "تم تعليمه كنافذ"); }
    catch (err) { toast("فشل التحديث: " + err.message, "err"); e.target.checked = !e.target.checked; }
  });

  ["prodPrice", "prodDiscount", "hasDiscount"].forEach((id) => $("#" + id).addEventListener("input", updatePreview));
  $("#hasDiscount").addEventListener("change", updatePreview);
  $("#prodImage").addEventListener("change", (e) => {
    pendingFile = e.target.files[0] || null;
    if (pendingFile) setImagePreview(URL.createObjectURL(pendingFile));
  });
  $("#productForm").addEventListener("submit", save);

  onSnapshot(
    collection(db, "products"),
    (snap) => {
      store.products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
      bus.dispatchEvent(new Event("products"));
    },
    (err) => { console.error(err); toast("تعذر تحميل المنتجات: " + err.message, "err"); },
  );
}
