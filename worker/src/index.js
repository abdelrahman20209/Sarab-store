// =====================================================================
//  Sarab API — Cloudflare Worker
//  1) كود التفعيل OTP على الإيميل عند أول تسجيل   (/otp/send , /otp/verify)
//  2) الرسائل الترويجية لكل العملاء من لوحة الأدمن   (/promo)
//  مفتاح Brevo محفوظ كـ secret باسم BREVO_API_KEY ولا يظهر في كود الموقع.
// =====================================================================
const BREVO = "https://api.brevo.com/v3";
const OTP_TTL = 600; // 10 دقائق
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
const validEmail = (e) => typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSender(env) {
  if (env.SENDER_EMAIL) return { email: env.SENDER_EMAIL, name: env.SENDER_NAME || env.STORE_NAME || "Sarab" };
  const cached = await env.KV.get("sender", "json");
  if (cached) return cached;
  const res = await fetch(`${BREVO}/senders`, { headers: { "api-key": env.BREVO_API_KEY, accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  const s = (data.senders || []).find((x) => x.active) || (data.senders || [])[0];
  if (!s) throw new Error("لا يوجد مُرسِل مفعّل في حساب Brevo");
  const sender = { email: s.email, name: env.SENDER_NAME || s.name || env.STORE_NAME || "Sarab" };
  await env.KV.put("sender", JSON.stringify(sender), { expirationTtl: 86400 });
  return sender;
}

async function brevoSend(env, payload) {
  const res = await fetch(`${BREVO}/smtp/email`, {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.log("brevo error", res.status, t.slice(0, 300));
    throw new Error("brevo_" + res.status);
  }
}

function shell(env, inner) {
  const store = esc(env.STORE_NAME || "سراب");
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#0b0b0b;font-family:Tahoma,Arial,sans-serif;color:#f3f0ea">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px">
    <div style="text-align:center;font-size:26px;font-weight:bold;color:#c5a059;letter-spacing:1px;padding-bottom:18px">${store}</div>
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:26px 22px;line-height:1.9;font-size:16px;text-align:right">${inner}</div>
    <p style="text-align:center;color:#8f8a81;font-size:12px;padding-top:16px">© ${new Date().getFullYear()} ${store}</p>
  </div></body></html>`;
}

/* ---------------- OTP ---------------- */
async function otpSend(req, env, body) {
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return [{ error: "صيغة الإيميل غير صحيحة" }, 400];
  const ip = req.headers.get("CF-Connecting-IP") || "0";

  if (await env.KV.get("cd:" + email)) return [{ error: "انتظر دقيقة قبل طلب كود جديد" }, 429];
  const ipKey = "ip:" + ip;
  const ipCount = Number((await env.KV.get(ipKey)) || 0);
  if (ipCount >= 8) return [{ error: "محاولات كثيرة، حاول بعد ساعة" }, 429];

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const hash = await sha256(`${email}:${code}:${env.BREVO_API_KEY}`);
  await Promise.all([
    env.KV.put("otp:" + email, JSON.stringify({ hash, tries: 0 }), { expirationTtl: OTP_TTL }),
    env.KV.put("cd:" + email, "1", { expirationTtl: 60 }),
    env.KV.put(ipKey, String(ipCount + 1), { expirationTtl: 3600 }),
  ]);

  const name = esc(String(body.name || "").slice(0, 60));
  const store = env.STORE_NAME || "سراب";
  await brevoSend(env, {
    sender: await getSender(env),
    to: [{ email }],
    subject: `${code} — كود تفعيل حسابك في ${store}`,
    htmlContent: shell(env, `
      <p style="margin:0 0 10px">أهلاً ${name || "بك"} 👋</p>
      <p style="margin:0 0 14px">كود تفعيل حسابك في ${esc(store)}:</p>
      <div style="direction:ltr;text-align:center;font-size:34px;letter-spacing:10px;font-weight:bold;color:#fff;background:#8e0000;border-radius:12px;padding:14px 0">${code}</div>
      <p style="margin:14px 0 0;color:#a09a90;font-size:14px">الكود صالح لمدة 10 دقائق. لو ما طلبتش الكود ده، تجاهل الرسالة.</p>`),
  });
  return [{ ok: true }, 200];
}

async function otpVerify(env, body) {
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) return [{ error: "الكود غير صحيح" }, 400];
  const rec = await env.KV.get("otp:" + email, "json");
  if (!rec) return [{ error: "انتهت صلاحية الكود — اطلب كود جديد" }, 400];
  if (rec.tries >= 5) { await env.KV.delete("otp:" + email); return [{ error: "محاولات كثيرة — اطلب كود جديد" }, 429]; }
  const hash = await sha256(`${email}:${code}:${env.BREVO_API_KEY}`);
  if (hash !== rec.hash) {
    await env.KV.put("otp:" + email, JSON.stringify({ hash: rec.hash, tries: rec.tries + 1 }), { expirationTtl: OTP_TTL });
    return [{ error: "الكود غير صحيح" }, 400];
  }
  await env.KV.delete("otp:" + email);
  return [{ ok: true }, 200];
}

/* ---------------- الرسائل الترويجية (للأدمن فقط) ---------------- */
async function requireAdmin(req, env) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const look = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }),
  });
  if (!look.ok) return null;
  const u = ((await look.json()).users || [])[0];
  if (!u) return null;
  // قواعد Firestore تسمح للمدير فقط بقراءة مستنده في admins — نجاح القراءة = مدير
  const adm = await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT}/databases/(default)/documents/admins/${u.localId}`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!adm.ok) return null;
  return { uid: u.localId, email: u.email, token };
}

async function listRecipients(env, token) {
  const out = new Map();
  let pageToken = "";
  for (let page = 0; page < 8; page++) {
    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT}/databases/(default)/documents/users?pageSize=300${pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""}`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) throw new Error("users_" + res.status);
    const data = await res.json();
    for (const d of data.documents || []) {
      const f = d.fields || {};
      const email = String(f.email?.stringValue || "").trim().toLowerCase();
      if (!validEmail(email) || f.marketing?.booleanValue === false) continue;
      out.set(email, String(f.name?.stringValue || "").slice(0, 60));
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  return [...out].map(([email, name]) => ({ email, name }));
}

function promoHtml(env, p) {
  const paras = String(p.message).split(/\n{2,}/).map((b) => `<p style="margin:0 0 14px">${esc(b).replace(/\n/g, "<br>")}</p>`).join("");
  const img = /^https:\/\/[^\s"'<>]+$/.test(p.imageUrl || "") ? `<img src="${esc(p.imageUrl)}" alt="" style="width:100%;border-radius:12px;margin-bottom:16px;display:block">` : "";
  const btn = /^https:\/\/[^\s"'<>]+$/.test(p.buttonUrl || "") && p.buttonText
    ? `<div style="text-align:center;padding-top:8px"><a href="${esc(p.buttonUrl)}" style="display:inline-block;background:#e30613;color:#fff;text-decoration:none;font-weight:bold;padding:13px 32px;border-radius:12px">${esc(p.buttonText)}</a></div>` : "";
  return shell(env, `${img}<h2 style="margin:0 0 14px;color:#fff;font-size:22px">${esc(p.title || p.subject)}</h2>${paras}${btn}
    <p style="margin:22px 0 0;color:#8f8a81;font-size:12px;border-top:1px solid #2a2a2a;padding-top:12px">وصلتك الرسالة دي لأنك مسجّل في ${esc(env.STORE_NAME || "سراب")}. تقدر توقف العروض من صفحة «حسابي» في الموقع.</p>`);
}

async function promo(req, env, body) {
  const admin = await requireAdmin(req, env);
  if (!admin) return [{ error: "غير مصرّح — سجّل دخولك كمدير" }, 403];
  const p = {
    subject: String(body.subject || "").trim().slice(0, 150),
    title: String(body.title || "").trim().slice(0, 150),
    message: String(body.message || "").trim().slice(0, 5000),
    buttonText: String(body.buttonText || "").trim().slice(0, 40),
    buttonUrl: String(body.buttonUrl || "").trim(),
    imageUrl: String(body.imageUrl || "").trim(),
  };
  if (!p.subject || !p.message) return [{ error: "اكتب عنوان الرسالة ونصّها" }, 400];

  const sender = await getSender(env);
  const htmlContent = promoHtml(env, p);
  if (body.mode === "count") return [{ total: (await listRecipients(env, admin.token)).length }, 200];
  if (body.mode === "test") {
    await brevoSend(env, { sender, to: [{ email: admin.email }], subject: "[تجربة] " + p.subject, htmlContent });
    return [{ ok: true, sent: 1, to: admin.email }, 200];
  }

  const list = await listRecipients(env, admin.token);
  let sent = 0, failed = 0;
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    try {
      await brevoSend(env, { sender, subject: p.subject, htmlContent, messageVersions: batch.map((r) => ({ to: [r.name ? r : { email: r.email }] })) });
      sent += batch.length;
    } catch { failed += batch.length; }
  }
  return [{ ok: true, total: list.length, sent, failed }, 200];
}

export default {
  async fetch(req, env) {
    const headers = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const { pathname } = new URL(req.url);
    if (req.method === "GET" && pathname === "/") return json({ ok: true, service: "sarab-api", ready: !!env.BREVO_API_KEY }, 200, headers);
    if (req.method !== "POST") return json({ error: "not found" }, 404, headers);
    if (!env.BREVO_API_KEY) return json({ error: "خدمة الإيميل غير مفعّلة بعد (المفتاح غير مضاف)" }, 503, headers);

    let body = {};
    try { body = await req.json(); } catch {}
    try {
      const [data, status] =
        pathname === "/otp/send" ? await otpSend(req, env, body)
        : pathname === "/otp/verify" ? await otpVerify(env, body)
        : pathname === "/promo" ? await promo(req, env, body)
        : [{ error: "not found" }, 404];
      return json(data, status, headers);
    } catch (e) {
      console.log("error", pathname, e.message);
      const brevo = String(e.message).startsWith("brevo_");
      return json({ error: brevo ? "تعذّر إرسال الإيميل — راجع حساب Brevo (المُرسِل أو الحد اليومي)" : e.message || "خطأ في الخادم" }, 502, headers);
    }
  },
};
