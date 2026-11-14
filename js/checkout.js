// إتمام الطلب: المنطقة + البيانات + الفاتورة (شحن + مقدّم الآن، والباقي عند الاستلام)
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { $, esc, money, db, getCart, setCart, whenUser, loadZones, loadProducts, priceOf, invoice, toast } from "./core.js";
import { initLayout } from "./layout.js";

const user = await whenUser();
if (!user) location.replace("login.html?next=checkout.html");

await initLayout("cart");
let items = getCart();
let zones = [];
let zone = null;

const phoneOk = (v) => /^01[0125]\d{8}$/.test(v);
const digits = (v) => String(v || "").replace(/[^\d]/g, "").replace(/^(?:0020|20)(?=1)/, "0");

function paint() {
  const inv = invoice(items, zone);
  $("#invItems").innerHTML = items.map((i) => `<li><span>${esc(i.name)} × ${esc(i.quantity)}</span><span>${money(i.price * i.quantity)}</span></li>`).join("");
  $("#iSub").textContent = money(inv.subtotal);
  $("#iZone").textContent = zone ? `(${zone.name})` : "";
  $("#iShip").textContent = zone ? money(inv.shipping) : "اختَر المنطقة";
  $("#iTotal").textContent = zone ? money(inv.total) : "—";
  $("#iNow").textContent = zone ? money(inv.payNow) : "—";
  $("#iLater").textContent = zone ? money(inv.payOnDelivery) : "—";
  $("#iExplain").textContent = zone
    ? `المبلغ المطلوب الآن = الشحن ${money(inv.shipping)}${inv.deposit ? ` + مقدّم ${inv.depositPct}% من سعر المنتجات (${money(inv.deposit)})` : ""}.`
    : "";
  $("#coBtn").disabled = !zone || !items.length;
}

async function init() {
  if (!items.length) return location.replace("cart.html");
  paint();

  const [zs, prods, profile] = await Promise.all([
    loadZones().catch((e) => { console.error(e); return null; }),
    loadProducts().catch(() => null),
    getDoc(doc(db, "users", user.uid)).then((s) => (s.exists() ? s.data() : {})).catch(() => ({})),
  ]);

  // تحديث الأسعار والتوفر من المتجر (السلة محفوظة على الجهاز وقد تكون قديمة)
  if (prods) {
    const before = items.length;
    items = items.map((i) => {
      const p = prods.find((x) => x.id === i.id);
      return p && p.inStock !== false ? { ...i, name: p.name, price: priceOf(p), image: p.image || i.image } : null;
    }).filter(Boolean);
    setCart(items);
    if (items.length < before) toast("تم حذف منتجات لم تعد متوفرة من سلتك", "err");
    if (!items.length) return location.replace("cart.html");
  }

  const sel = $("#zone");
  if (!zs) sel.innerHTML = `<option value="">تعذّر تحميل المناطق — أعد تحميل الصفحة</option>`;
  else if (!zs.length) sel.innerHTML = `<option value="">لا توجد مناطق توصيل متاحة حالياً</option>`;
  else {
    zones = zs;
    sel.innerHTML = `<option value="">— اختَر المنطقة —</option>` + zones.map((z) => `<option value="${esc(z.id)}">${esc(z.name)} — شحن ${money(z.shipping)}</option>`).join("");
    if (profile.zoneId && zones.some((z) => z.id === profile.zoneId)) { sel.value = profile.zoneId; zone = zones.find((z) => z.id === profile.zoneId); }
  }
  $("#name").value = profile.name || user.displayName || "";
  $("#phone").value = profile.phone || "";
  $("#altPhone").value = profile.altPhone || "";
  $("#address").value = profile.address || "";
  paint();
}

$("#zone").addEventListener("change", (e) => { zone = zones.find((z) => z.id === e.target.value) || null; paint(); });

$("#coForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#coErr");
  err.textContent = "";
  const name = $("#name").value.trim();
  const phone = digits($("#phone").value);
  const altPhone = digits($("#altPhone").value);
  const address = $("#address").value.trim();
  const notes = $("#notes").value.trim();
  const fail = (msg, id) => { err.textContent = msg; $("#" + id)?.focus(); };

  if (!zone) return fail("اختَر منطقة التوصيل أولاً.", "zone");
  if (address.length < 10) return fail("اكتب العنوان بالتفصيل (الشارع، العمارة، الدور، الشقة).", "address");
  if (name.length < 3) return fail("اكتب اسم المستلم.", "name");
  if (!phoneOk(phone)) return fail("رقم الموبايل غير صحيح — اكتبه 11 رقم يبدأ بـ 01.", "phone");
  if (altPhone && !phoneOk(altPhone)) return fail("الرقم البديل غير صحيح — اكتبه 11 رقم أو اتركه فارغاً.", "altPhone");
  if (altPhone && altPhone === phone) return fail("الرقم البديل لازم يكون مختلف عن الرقم الأساسي.", "altPhone");
  if (!$("#agree").checked) return fail("برجاء الموافقة على الشروط والأحكام.", "agree");

  const btn = $("#coBtn");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الطلب...`;
  try {
    const inv = invoice(items, zone);
    const ref = "SR" + String(Math.floor(100000 + Math.random() * 900000));
    const order = {
      userId: user.uid,
      email: user.email || "",
      referenceCode: ref,
      status: "pending_payment",
      customerName: name,
      customerPhone: phone,
      altPhone,
      zoneId: zone.id,
      zoneName: zone.name,
      addressDetail: address,
      address: `${zone.name} — ${address}`,
      notes,
      cartItems: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image || "", size: i.size || "" })),
      subtotal: inv.subtotal,
      shipping: inv.shipping,
      depositPct: inv.depositPct,
      deposit: inv.deposit,
      payNow: inv.payNow,
      payOnDelivery: inv.payOnDelivery,
      totalPrice: inv.total,
      createdAt: serverTimestamp(),
    };
    const created = await addDoc(collection(db, "orders"), order);
    // حفظ بيانات التوصيل في الحساب لتسهيل الطلب القادم (فشلها لا يوقف الطلب)
    setDoc(doc(db, "users", user.uid), { name, phone, altPhone, zoneId: zone.id, zoneName: zone.name, address, email: user.email || "" }, { merge: true }).catch(() => {});
    setCart([]);
    location.href = `order.html?id=${encodeURIComponent(created.id)}&new=1`;
  } catch (ex) {
    console.error(ex);
    err.textContent = "تعذّر تسجيل الطلب. تأكد من الإنترنت وحاول مرة أخرى.";
    btn.disabled = false;
    btn.innerHTML = `تأكيد الطلب <i class="fas fa-arrow-left"></i>`;
  }
});

if (user) init();
