(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TripleHCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAUDI_MOBILE_RE = /^\+9665\d{8}$/;
  const WEB_APP_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/;

  function normalizeArabicDigits(value) {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    return String(value || "")
      .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
      .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)));
  }

  function normalizeSaudiMobile(rawValue) {
    const compact = normalizeArabicDigits(rawValue)
      .replace(/^tel:/i, "")
      .replace(/[^\d+]/g, "");
    if (!compact) return null;

    let mobile = compact;
    if (mobile.startsWith("00966")) mobile = "+966" + mobile.slice(5);
    else if (mobile.startsWith("966")) mobile = "+" + mobile;
    else if (mobile.startsWith("05")) mobile = "+966" + mobile.slice(1);

    if (!SAUDI_MOBILE_RE.test(mobile)) {
      const match = mobile.match(/(?:\+?966|00966|0)?5\d{8}/);
      if (!match) return null;
      mobile = match[0].replace(/[^\d+]/g, "");
      if (mobile.startsWith("00966")) mobile = "+966" + mobile.slice(5);
      else if (mobile.startsWith("966")) mobile = "+" + mobile;
      else if (mobile.startsWith("05")) mobile = "+966" + mobile.slice(1);
    }

    return SAUDI_MOBILE_RE.test(mobile) ? mobile : null;
  }

  function normalizeWebAppUrl(value) {
    const url = String(value || "").trim();
    if (!WEB_APP_RE.test(url)) {
      throw new Error("رابط Apps Script غير صحيح. استخدم رابط النشر المنتهي بـ /exec");
    }
    return url;
  }

  function buildProviderMessage(template, variables) {
    const values = variables || {};
    const city = values.city || "المدينة";
    const service = values.service || "الخدمة";
    const phone = values.phone || "";
    return String(template || "")
      .replace(/\{المدينة\}/gi, city)
      .replace(/\{الخدمة\}/gi, service)
      .replace(/\{نوع_الخدمة\}/gi, service)
      .replace(/\{الرقم\}/gi, phone)
      .replace(/\{رقم_المزود\}/gi, phone);
  }

  return {
    buildProviderMessage,
    normalizeArabicDigits,
    normalizeSaudiMobile,
    normalizeWebAppUrl
  };
});
