// رسالة ترويجية بالإيميل لكل العملاء (تُرسل عبر سيرفر الإيميلات — المفتاح ليس في المتصفح)
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth, $, esc, toast, fmtDate, API_URL } from "./admin-core.js";
import { uploadImage } from "./admin-products.js";

let imageUrl = "";

async function call(mode) {
  if (!API_URL) throw new Error("سيرفر الإيميلات غير مفعّل");
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(API_URL.replace(/\/$/, "") + "/promo", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      mode,
      subject: $("#prSubject").value.trim(),
      title: $("#prTitle").value.trim(),
      message: $("#prMessage").value.trim(),
      buttonText: $("#prBtnText").value.trim(),
      buttonUrl: $("#prBtnUrl").value.trim(),
      imageUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "فشل الإرسال");
  return data;
}

function preview() {
  const msg = $("#prMessage").value.trim() || "نص الرسالة يظهر هنا...";
  const btn = $("#prBtnText").value.trim();
  $("#prPreview").innerHTML = `
    ${imageUrl ? `<img src="${esc(imageUrl)}" alt="" style="width: 100%; border-radius: 12px; margin-bottom: 12px">` : ""}
    <h4 style="font-size: 1.15rem; margin-bottom: 8px">${esc($("#prTitle").value.trim() || $("#prSubject").value.trim() || "عنوان الرسالة")}</h4>
    ${msg.split(/\n{2,}/).map((p) => `<p style="margin-bottom: 10px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
    ${btn ? `<div class="center"><span class="btn primary" style="pointer-events: none">${esc(btn)}</span></div>` : ""}`;
}

async function history() {
  try {
    const snap = await getDocs(query(collection(db, "promos"), orderBy("createdAt", "desc"), limit(8)));
    $("#prHistory").innerHTML = snap.empty
      ? `<p class="muted">لم تُرسل أي رسالة بعد.</p>`
      : snap.docs.map((d) => { const p = d.data(); return `<div class="kv"><span>${esc(p.subject)}</span><b>${esc(p.sent)} مستلم${p.failed ? ` · فشل ${esc(p.failed)}` : ""} · ${esc(fmtDate(p.createdAt))}</b></div>`; }).join("");
  } catch { $("#prHistory").innerHTML = ""; }
}

async function run(mode, btn) {
  if (!$("#prSubject").value.trim() || !$("#prMessage").value.trim()) return toast("اكتب عنوان الرسالة ونصّها", "err");
  const url = $("#prBtnUrl").value.trim();
  if (url && !/^https:\/\//i.test(url)) return toast("رابط الزر لازم يبدأ بـ https://", "err");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...`;
  try {
    if (mode === "send") {
      const { total } = await call("count");
      if (!total) throw new Error("لا يوجد عملاء مسجّلين وموافقين على استلام العروض");
      if (!confirm(`سيتم إرسال الرسالة إلى ${total} عميل. لا يمكن التراجع بعد الإرسال.\n\nمتأكد؟`)) return;
    }
    const r = await call(mode);
    if (mode === "test") return toast(`تم إرسال تجربة إلى ${r.to}`);
    await addDoc(collection(db, "promos"), { subject: $("#prSubject").value.trim(), sent: r.sent, failed: r.failed, total: r.total, by: auth.currentUser.email, createdAt: serverTimestamp() }).catch(() => {});
    toast(`تم الإرسال إلى ${r.sent} عميل${r.failed ? ` (فشل ${r.failed})` : ""}`);
    history();
  } catch (e) { toast(e.message, "err"); }
  finally { btn.disabled = false; btn.innerHTML = label; }
}

export function initPromo() {
  ["prSubject", "prTitle", "prMessage", "prBtnText"].forEach((id) => $("#" + id).addEventListener("input", preview));
  $("#prImage").addEventListener("change", async (e) => {
    if (!e.target.files[0]) return;
    $("#prImageLabel").innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الرفع...`;
    try { imageUrl = await uploadImage(e.target.files[0]); toast("تم رفع الصورة"); }
    catch (err) { toast(err.message, "err"); }
    $("#prImageLabel").innerHTML = imageUrl ? `<i class="fas fa-image"></i> تغيير الصورة` : `<i class="fas fa-upload"></i> صورة (اختياري)`;
    $("#prImageRm").hidden = !imageUrl;
    preview();
  });
  $("#prImageRm").onclick = () => { imageUrl = ""; $("#prImage").value = ""; $("#prImageRm").hidden = true; $("#prImageLabel").innerHTML = `<i class="fas fa-upload"></i> صورة (اختياري)`; preview(); };
  $("#prTest").onclick = (e) => run("test", e.currentTarget);
  $("#prSend").onclick = (e) => run("send", e.currentTarget);
  preview();
  history();
}
