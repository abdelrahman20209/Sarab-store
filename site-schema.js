// =====================================================================
//  مخطط محتوى الموقع — مصدر واحد للنصوص/الصور القابلة للتعديل من لوحة التحكم
//  كل حقل:  [المفتاح, الاسم في اللوحة, القيمة الافتراضية, النوع]
//  النوع: text | area | img | url | tel
//  القيم المحفوظة في Firestore (settings/site) تتغلب على الافتراضي.
// =====================================================================
const f = (k, l, d, t = "text") => ({ k, l, d, t });
const IMG = (n) => `img/WhatsApp%20Image%202026-04-05%20at%20${n}%20PM.jpeg`;

export const SITE_GROUPS = [
  { id: "nav", title: "الهيدر والقوائم", icon: "fa-bars", fields: [
    f("nav_store", "رابط: المتجر", "المتجر"),
    f("nav_offers", "رابط: العروض", "العروض"),
    f("nav_orders", "رابط: متابعة الطلبات", "متابعة الطلبات"),
    f("search_placeholder", "نص خانة البحث", "ابحث عن عطرك..."),
    f("bn_home", "القائمة السفلية: الرئيسية", "الرئيسية"),
    f("bn_perfumes", "القائمة السفلية: العطور", "العطور"),
    f("bn_offers", "القائمة السفلية: العروض", "العروض"),
    f("bn_cart", "القائمة السفلية: السلة", "السلة"),
  ] },
  { id: "hero", title: "الواجهة الرئيسية (Hero)", icon: "fa-image", fields: [
    f("hero_eyebrow", "العنوان الصغير", "Sarab Perfumes"),
    f("hero_title_a", "العنوان — الجزء الأول", "عطرٌ يترك"),
    f("hero_title_em", "العنوان — الكلمة الحمراء", "أثراً"),
    f("hero_title_b", "العنوان — الجزء الأخير", "لا يُنسى"),
    f("hero_lead", "الوصف", "سراب.. حكاية تمزج بين سحر الشرق وفخامة الحاضر. اكتشف تشكيلة عطور اختيرت بعناية لتليق بحضورك.", "area"),
    f("hero_btn1", "الزر الأول", "تسوّق المجموعة"),
    f("hero_btn2", "الزر الثاني", "العروض الحصرية"),
    f("hero_img1", "صورة الوسط", IMG("7.17.17"), "img"),
    f("hero_img2", "صورة اليمين", IMG("7.18.11"), "img"),
    f("hero_img3", "صورة اليسار", IMG("7.16.15"), "img"),
  ] },
  { id: "marquee", title: "الشريط المتحرك", icon: "fa-ellipsis", fields: [
    f("marquee_1", "العبارة 1", "سراب"),
    f("marquee_2", "العبارة 2", "SARAB"),
    f("marquee_3", "العبارة 3", "فخامة الشرق"),
    f("marquee_4", "العبارة 4", "عطور تدوم"),
  ] },
  { id: "cats", title: "التسوق حسب الفئة", icon: "fa-table-cells-large", fields: [
    f("cat_kicker", "العنوان الصغير", "Shop By"),
    f("cat_title", "العنوان", "تسوّق"),
    f("cat_title_em", "العنوان — الكلمة الحمراء", "حسب الفئة"),
    f("cat1_title", "فئة 1 (رجالي)", "رجالي"),
    f("cat2_title", "فئة 2 (حريمي)", "حريمي"),
    f("cat3_title", "فئة 3 (للجنسين)", "للجنسين"),
    f("cat4_title", "فئة 4 (العروض)", "العروض"),
    f("cat1_img", "صورة فئة 1", IMG("7.17.17"), "img"),
    f("cat2_img", "صورة فئة 2", IMG("7.16.15"), "img"),
    f("cat3_img", "صورة فئة 3", IMG("7.18.11"), "img"),
    f("cat4_img", "صورة فئة 4", IMG("7.17.45"), "img"),
  ] },
  { id: "collection", title: "المجموعة الأساسية", icon: "fa-droplet", fields: [
    f("col_kicker", "العنوان الصغير", "The Collection"),
    f("col_title", "العنوان", "المجموعة"),
    f("col_title_em", "العنوان — الكلمة الحمراء", "الأساسية"),
    f("chip_all", "فلتر: الكل", "الكل"),
    f("chip_men", "فلتر: رجالي", "رجالي"),
    f("chip_women", "فلتر: حريمي", "حريمي"),
    f("chip_unisex", "فلتر: للجنسين", "للجنسين"),
  ] },
  { id: "offers", title: "العروض الحصرية", icon: "fa-tags", fields: [
    f("off_kicker", "العنوان الصغير", "Exclusive"),
    f("off_title", "العنوان", "عروض"),
    f("off_title_em", "العنوان — الكلمة الحمراء", "حصرية"),
  ] },
  { id: "story", title: "حكاية سراب", icon: "fa-feather", fields: [
    f("story_title", "العنوان", "حكاية سراب"),
    f("story_text", "النص", "من سحر الشرق وأصالة العطور العربية وُلد سراب. نختار لك كل عطر ليحمل أثراً يبقى في الذاكرة، بتغليف أنيق وتجربة شراء بسيطة من أول نظرة حتى باب بيتك.", "area"),
  ] },
  { id: "values", title: "المميزات الثلاث", icon: "fa-gem", fields: [
    f("val1_title", "ميزة 1 — العنوان", "تشكيلة مختارة"),
    f("val1_text", "ميزة 1 — النص", "عطور منتقاة بعناية لتناسب كل ذوق ومناسبة."),
    f("val2_title", "ميزة 2 — العنوان", "تغليف فاخر"),
    f("val2_text", "ميزة 2 — النص", "كل عطر يصلك في تغليف يليق بالهدية."),
    f("val3_title", "ميزة 3 — العنوان", "دعم مباشر"),
    f("val3_text", "ميزة 3 — النص", "فريقنا جاهز للرد على استفساراتك عبر واتساب."),
  ] },
  { id: "cta", title: "الدعوة للشراء (CTA)", icon: "fa-bullhorn", fields: [
    f("cta_title", "العنوان", "جاهز لتجد عطرك؟"),
    f("cta_text", "النص", "تصفح المجموعة الكاملة أو اسأل فريقنا ليرشحك للأنسب."),
    f("cta_btn", "نص الزر", "اطلب عبر واتساب"),
  ] },
  { id: "footer", title: "الفوتر وبيانات التواصل", icon: "fa-address-card", fields: [
    f("foot_blurb", "جملة الفوتر", "سراب.. حكاية تمزج بين سحر الشرق وفخامة الحاضر.", "area"),
    f("foot_links_title", "عنوان: روابط سريعة", "روابط سريعة"),
    f("foot_contact_title", "عنوان: تواصل معنا", "تواصل معنا"),
    f("foot_support", "نص الدعم الفني", "الدعم الفني المباشر"),
    f("foot_copy", "حقوق النشر", "جميع الحقوق محفوظة"),
    f("whatsapp", "رقم واتساب (بصيغة دولية بدون +)", "201148906594", "tel"),
    f("instagram", "رابط انستجرام", "https://www.instagram.com/sarab.global/", "url"),
    f("tiktok", "رابط تيك توك", "https://www.tiktok.com/@sarab.global", "url"),
    f("facebook", "رابط فيسبوك (اتركه فارغاً لإخفائه)", "", "url"),
    f("email", "البريد الإلكتروني", "support@sarab.com"),
  ] },
  { id: "side", title: "القائمة الجانبية", icon: "fa-table-list", fields: [
    f("side_title", "عنوان التصنيفات", "التصنيفات"),
    f("side_help_title", "عنوان المساعدة", "هل تحتاج مساعدة؟"),
    f("side_help_text", "نص المساعدة", "نحن هنا لمساعدتك في أي استفسار عطري أو تقني."),
  ] },
  { id: "ui", title: "نصوص كروت المنتجات", icon: "fa-bag-shopping", fields: [
    f("txt_add", "زر الإضافة للسلة", "إضافة للسلة"),
    f("txt_in", "عبارة: متوفر", "متوفر حالياً"),
    f("txt_out", "عبارة: نفذت", "نفذت الكمية"),
  ] },
];

export const FIELD_MAP = Object.fromEntries(SITE_GROUPS.flatMap((g) => g.fields).map((x) => [x.k, x]));
export const DEFAULTS = Object.fromEntries(Object.values(FIELD_MAP).map((x) => [x.k, x.d]));

export const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  text: "للطلب والاستفسار تواصل معنا مباشرة عبر واتساب",
  link: "",
  linkText: "",
  style: "red", // red | gold | black
  showCountdown: false,
  expiresAt: null, // ISO string أو null = بدون انتهاء
  durationLabel: "none",
};

// آمن للروابط القادمة من لوحة التحكم
export function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return "https://" + s;
  return "";
}
