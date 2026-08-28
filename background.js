const HARAJ_URL_RE = /^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//;
const autoSaveCooldown = new Map();

function normalizeWebAppUrl(value) {
  const url = String(value || "").trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url)) throw new Error("رابط Apps Script غير صحيح. استخدم رابط النشر المنتهي بـ /exec");
  return url;
}
async function readJson(response) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { throw new Error("الخادم أعاد رداً غير صالح. تأكد من رابط /exec وصلاحية النشر."); }
  if (!response.ok || data.ok === false) throw new Error(data.error || "فشل الاتصال بالشيت.");
  return data;
}
async function apiRequest(message) {
  const settings = await chrome.storage.sync.get(["webAppUrl", "token"]);
  const url = normalizeWebAppUrl(settings.webAppUrl);
  if (!settings.token) throw new Error("أدخل رمز الحماية في إعدادات الإضافة.");
  if (message.type === "GET_SHEETS") {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("action", "sheets");
    requestUrl.searchParams.set("token", settings.token);
    return readJson(await fetch(requestUrl.toString(), { redirect: "follow" }));
  }
  if (message.type === "SAVE_CONTACT") {
    return readJson(await fetch(url, { method:"POST", redirect:"follow", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({token:settings.token,action:"save",sheetName:message.sheetName,mobile:message.mobile,sourceUrl:message.sourceUrl}) }));
  }
  throw new Error("طلب غير معروف.");
}
async function isToolEnabled() {
  const settings = await chrome.storage.sync.get("toolEnabled");
  return settings.toolEnabled !== false;
}
async function autoSaveHarajContact(tabId, tabUrl) {
  if (!(await isToolEnabled())) return;
  const settings = await chrome.storage.sync.get(["webAppUrl", "token", "sheetName"]);
  if (!settings.webAppUrl || !settings.token || !settings.sheetName) return;
  chrome.tabs.sendMessage(tabId, { type: "COLLECT_MOBILE" }, async (response) => {
    if (chrome.runtime.lastError || !response || !response.ok || !response.mobile) return;
    try {
      await apiRequest({ type: "SAVE_CONTACT", sheetName: settings.sheetName, mobile: response.mobile, sourceUrl: response.sourceUrl || tabUrl });
    } catch (_) {}
  });
}
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || !HARAJ_URL_RE.test(tab.url)) return;
  if (!(await isToolEnabled())) return;
  const now = Date.now();
  const last = autoSaveCooldown.get(tabId) || 0;
  if (now - last < 30000) return;
  autoSaveCooldown.set(tabId, now);
  setTimeout(() => autoSaveHarajContact(tabId, tab.url), 500);
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["GET_SHEETS", "SAVE_CONTACT"].includes(message && message.type)) return;
  apiRequest(message).then(data => sendResponse({ok:true,data:data})).catch(error => sendResponse({ok:false,error:error.message}));
  return true;
});
