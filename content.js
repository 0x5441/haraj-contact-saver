const CONTACT_BUTTON_SELECTOR = '[data-testid="post-contact"]';
const MOBILE_SELECTOR = 'a[data-testid="contact_mobile"][href^="tel:"]';

function normalizeArabicDigits(value) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return String(value || "")
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)));
}

function normalizeSaudiMobile(rawValue) {
  const compact = normalizeArabicDigits(rawValue).replace(/^tel:/i, "").replace(/[^\d+]/g, "");
  if (!compact) return null;

  let mobile = compact;
  if (mobile.startsWith("00966")) mobile = "+966" + mobile.slice(5);
  else if (mobile.startsWith("966")) mobile = "+" + mobile;
  else if (mobile.startsWith("05")) mobile = "+966" + mobile.slice(1);

  if (!/^\+9665\d{8}$/.test(mobile)) {
    const match = mobile.match(/(?:\+?966|00966|0)?5\d{8}/);
    if (!match) return null;
    mobile = match[0].replace(/[^\d+]/g, "");
    if (mobile.startsWith("00966")) mobile = "+966" + mobile.slice(5);
    else if (mobile.startsWith("966")) mobile = "+" + mobile;
    else if (mobile.startsWith("05")) mobile = "+966" + mobile.slice(1);
  }

  return /^\+9665\d{8}$/.test(mobile) ? mobile : null;
}

function visibleElement(selector) {
  return Array.from(document.querySelectorAll(selector)).find(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function extractMobile(element) {
  if (!element) {
    throw new Error("ظهر عنصر التواصل لكن العنصر نفسه غير موجود.");
  }

  const href = element.getAttribute("href");
  const telLinks = Array.from(element.querySelectorAll('a[href^="tel:"]'));
  const hrefCandidates = [href, ...telLinks.map(link => link.getAttribute("href"))].filter(Boolean);

  for (const candidate of hrefCandidates) {
    const normalized = normalizeSaudiMobile(candidate);
    if (normalized) return normalized;
  }

  const fallbackCandidates = [
    element.textContent,
    element.innerText,
    element.getAttribute("data-value"),
    element.value,
    ...telLinks.map(link => link.getAttribute("href"))
  ].filter(Boolean);

  for (const candidate of fallbackCandidates) {
    const normalized = normalizeSaudiMobile(candidate);
    if (normalized) return normalized;
  }

  const hrefText = href ? `href="${href}"` : "href مفقود";
  throw new Error(`ظهر عنصر التواصل لكن href غير موجود أو الرقم غير صالح (${hrefText}).`);
}

function waitForVisible(selector, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  return new Promise((resolve, reject) => {
    let observer;
    let pollTimer;
    let timeoutTimer;

    const finish = (element) => {
      if (observer) observer.disconnect();
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      resolve(element);
    };

    const existing = visibleElement(selector);
    if (existing) return finish(existing);

    observer = new MutationObserver(() => {
      const element = visibleElement(selector);
      if (element) finish(element);
    });

    pollTimer = setInterval(() => {
      const element = visibleElement(selector);
      if (element) finish(element);
    }, 150);

    timeoutTimer = setTimeout(() => {
      if (observer) observer.disconnect();
      if (pollTimer) clearInterval(pollTimer);
      reject(new Error("لم يظهر رقم الجوال خلال 10 ثوانٍ."));
    }, timeoutMs);

    observer.observe(document.documentElement, {childList:true,subtree:true,attributes:true});
  });
}

async function waitForValidMobile(timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let observer;
    let pollTimer;
    let timeoutTimer;

    const cleanup = () => {
      if (observer) observer.disconnect();
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };

    const tryResolve = () => {
      const element = visibleElement(MOBILE_SELECTOR);
      if (!element) return false;
      try {
        const mobile = extractMobile(element);
        cleanup();
        resolve(mobile);
        return true;
      } catch (error) {
        return false;
      }
    };

    const check = () => {
      if (tryResolve()) return;
      if (Date.now() - start >= timeoutMs) {
        cleanup();
        const element = visibleElement(MOBILE_SELECTOR);
        if (element) {
          try {
            const invalid = extractMobile(element);
            if (invalid) {
              return;
            }
          } catch (error) {
            reject(new Error(`ظهر عنصر التواصل لكن href غير موجود أو الرقم غير صالح (${element.getAttribute("href") || "href مفقود"}).`));
            return;
          }
        }
        reject(new Error("لم يظهر رقم الجوال خلال 10 ثوانٍ."));
      }
    };

    if (tryResolve()) return;

    observer = new MutationObserver(check);
    pollTimer = setInterval(check, 200);
    timeoutTimer = setTimeout(() => {
      check();
    }, timeoutMs);

    observer.observe(document.documentElement, {childList:true,subtree:true,attributes:true});
  });
}

async function collectMobile() {
  let mobileElement = visibleElement(MOBILE_SELECTOR);
  if (!mobileElement) {
    const button = visibleElement(CONTACT_BUTTON_SELECTOR);
    if (!button) throw new Error('لم أجد زر التواصل data-testid="post-contact" في الصفحة.');
    button.click();
    mobileElement = await waitForVisible(MOBILE_SELECTOR, 10000);
  }

  try {
    return extractMobile(mobileElement);
  } catch (error) {
    return await waitForValidMobile(10000);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "COLLECT_MOBILE") return;
  collectMobile().then(mobile => sendResponse({ok:true,mobile:mobile,sourceUrl:location.href})).catch(error => sendResponse({ok:false,error:error.message}));
  return true;
});
