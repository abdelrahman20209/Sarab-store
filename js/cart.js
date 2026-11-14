// صفحة السلة
import { $, esc, money, getCart, setCart, cartTotal, whenUser, safeUrl } from "./core.js";
import { initLayout, T } from "./layout.js";

function render() {
  const items = getCart();
  $("#cartView").hidden = !items.length;
  $("#emptyView").hidden = !!items.length;
  $("#subtotal").textContent = money(cartTotal(items));
  $("#items").innerHTML = items.map((i) => `
    <div class="ci" data-id="${esc(i.id)}">
      <img src="${esc(safeUrl(i.image) || T("cat_fallback_img"))}" alt="" />
      <div>
        <b>${esc(i.name)}</b>
        <small>${i.size ? esc(i.size) + " · " : ""}${money(i.price)} للقطعة</small>
        <div class="qty" style="margin-top: 8px"><button type="button" data-q="-1" aria-label="أقل">−</button><span>${esc(i.quantity)}</span><button type="button" data-q="1" aria-label="أكثر">+</button></div>
      </div>
      <div class="ci-side"><b>${money(i.price * i.quantity)}</b><button class="rm" data-rm aria-label="حذف"><i class="fas fa-trash"></i></button></div>
    </div>`).join("");
}

$("#items").addEventListener("click", (e) => {
  const row = e.target.closest(".ci");
  if (!row) return;
  let items = getCart();
  const it = items.find((x) => x.id === row.dataset.id);
  if (!it) return;
  const q = e.target.closest("[data-q]");
  if (q) it.quantity = Math.min(20, it.quantity + Number(q.dataset.q));
  if (e.target.closest("[data-rm]") || it.quantity < 1) items = items.filter((x) => x !== it);
  setCart(items);
});
window.addEventListener("cart", render);

await initLayout("cart");
render();
// لو العميل مش مسجّل دخول، يسجّل الأول ثم يرجع لإتمام الطلب
whenUser().then((u) => { if (!u) $("#goCheckout").href = "login.html?next=checkout.html"; });
