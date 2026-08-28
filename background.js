const HARAJ_URL_RE = /^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//;
const autoSaveCooldown = new Map();

function normalizeWebAppUrl(value) {
  const url = String(value || "").trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url)) throw new Error("رابط Apps Script غير صحيح. استخدم رابط النشر المنتهي بـ /exec");
  return url;
}
async function readJson(response) {
  const text = await response.text();
  console.log("Apps Script raw response:", { url: response.url, status: response.status, body: text });
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
    console.log("GET_SHEETS request:", requestUrl.toString());
    return readJson(await fetch(requestUrl.toString(), { redirect: "follow" }));
  }

  if (message.type === "GET_SHEET_COLUMNS") {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("action", "columns");
    requestUrl.searchParams.set("token", settings.token);
    requestUrl.searchParams.set("sheetName", String(message.sheetName || ""));
    console.log("GET_SHEET_COLUMNS request:", requestUrl.toString());
    const result = await readJson(await fetch(requestUrl.toString(), { redirect: "follow" }));
    console.log("GET_SHEET_COLUMNS result:", result);
    return result;
  }

  if (message.type === "GET_ROWS") {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("action", "rows");
    requestUrl.searchParams.set("token", settings.token);
    requestUrl.searchParams.set("sheetName", String(message.sheetName || ""));
    requestUrl.searchParams.set("phoneColumn", String(message.phoneColumn || ""));
    requestUrl.searchParams.set("statusColumn", String(message.statusColumn || ""));
    requestUrl.searchParams.set("lastContactColumn", String(message.lastContactColumn || ""));
    console.log("GET_ROWS request:", requestUrl.toString());
    const result = await readJson(await fetch(url, { method:"POST", redirect:"follow", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({token:settings.token,action:"rows",sheetName:message.sheetName,phoneColumn:message.phoneColumn,statusColumn:message.statusColumn,lastContactColumn:message.lastContactColumn}) }));
    console.log("GET_ROWS result:", result);
    return result;
  }

  if (message.type === "UPDATE_ROW_STATUS") {
    const result = await readJson(await fetch(url, { method:"POST", redirect:"follow", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({token:settings.token,action:"updateStatus",sheetName:message.sheetName,rowNumber:message.rowNumber,statusColumn:message.statusColumn,lastContactColumn:message.lastContactColumn,status:message.status,lastContact:message.lastContact}) }));
    console.log("UPDATE_ROW_STATUS result:", result);
    return result;
  }

  if (message.type === "SAVE_CONTACT") {
    console.log("SAVE_CONTACT request:", { sheetName: message.sheetName, mobile: message.mobile });
    const result = await readJson(await fetch(url, { method:"POST", redirect:"follow", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({token:settings.token,action:"save",sheetName:message.sheetName,mobile:message.mobile,sourceUrl:message.sourceUrl}) }));
    console.log("SAVE_CONTACT result:", result);
    return result;
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
  if (!["GET_SHEETS", "GET_SHEET_COLUMNS", "GET_ROWS", "UPDATE_ROW_STATUS", "SAVE_CONTACT"].includes(message && message.type)) return;
  apiRequest(message).then(data => sendResponse({ok:true,data:data})).catch(error => sendResponse({ok:false,error:error.message}));
  return true;
});
