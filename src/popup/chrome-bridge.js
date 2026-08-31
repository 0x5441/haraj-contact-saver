(function () {
  "use strict";
  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response || !response.ok) return reject(new Error(response && response.error || "فشل الطلب."));
      resolve(response.data);
    }));
  }
  function sendTabMessage(tabId, message, fallbackError) {
    return new Promise((resolve, reject) => chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) return reject(new Error(fallbackError || chrome.runtime.lastError.message));
      if (!response || !response.ok) return reject(new Error(response && response.error || "تعذر قراءة الصفحة."));
      resolve(response);
    }));
  }
  window.ChromeBridge = { sendRuntimeMessage, sendTabMessage };
})();
