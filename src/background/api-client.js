(function () {
  "use strict";
  const POST_ACTIONS = {
    GET_ROWS: message => ({ action: "rows", sheetName: message.sheetName, phoneColumn: message.phoneColumn, statusColumn: message.statusColumn, lastContactColumn: message.lastContactColumn }),
    UPDATE_ROW_STATUS: message => ({ action: "updateStatus", sheetName: message.sheetName, rowNumber: message.rowNumber, statusColumn: message.statusColumn, lastContactColumn: message.lastContactColumn, status: message.status, lastContact: message.lastContact }),
    SAVE_CONTACT: message => ({ action: "save", sheetName: message.sheetName, mobile: message.mobile, sourceUrl: message.sourceUrl })
  };

  async function readJson(response) {
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) { throw new Error("الخادم أعاد رداً غير صالح. تأكد من رابط /exec وصلاحية النشر."); }
    if (!response.ok || data.ok === false) throw new Error(data.error || "فشل الاتصال بالشيت.");
    return data;
  }

  async function apiRequest(message) {
    const settings = await chrome.storage.sync.get(["webAppUrl", "token"]);
    const url = TripleHCore.normalizeWebAppUrl(settings.webAppUrl);
    if (!settings.token) throw new Error("أدخل رمز الحماية في إعدادات الإضافة.");

    if (message.type === "GET_SHEETS" || message.type === "GET_SHEET_COLUMNS") {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("action", message.type === "GET_SHEETS" ? "sheets" : "columns");
      requestUrl.searchParams.set("token", settings.token);
      if (message.type === "GET_SHEET_COLUMNS") requestUrl.searchParams.set("sheetName", String(message.sheetName || ""));
      return readJson(await fetch(requestUrl.toString(), { redirect: "follow" }));
    }

    const buildBody = POST_ACTIONS[message.type];
    if (!buildBody) throw new Error("طلب غير معروف.");
    const body = { token: settings.token, ...buildBody(message) };
    return readJson(await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }));
  }

  self.TripleHApi = { apiRequest };
})();
