importScripts("../shared/core.js", "api-client.js");

const HARAJ_URL_RE = /^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//;
const autoSaveCooldown = new Map();

const { apiRequest } = TripleHApi;
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
