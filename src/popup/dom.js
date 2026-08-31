(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const elements = {
    webAppUrlInput: byId("webAppUrl"), tokenInput: byId("token"), sheetSelect: byId("sheetName"),
    connectButton: byId("connect"), saveButton: byId("saveContact"), toggleToolButton: byId("toggleTool"),
    statusElement: byId("status"), versionElement: byId("extensionVersion"), providerSheetName: byId("providerSheetName"),
    phoneColumnSelect: byId("phoneColumnSelect"), statusColumnSelect: byId("statusColumnSelect"),
    lastContactColumnSelect: byId("lastContactColumnSelect"), manualPhoneInput: byId("manualPhoneInput"),
    citySelect: byId("citySelect"), serviceTypeSelect: byId("serviceTypeSelect"), customServiceInput: byId("customServiceInput"),
    templateSelect: byId("templateSelect"), messageText: byId("messageText"), currentRowValue: byId("currentRowValue"),
    currentPhoneValue: byId("currentPhoneValue"), remainingCountValue: byId("remainingCountValue"),
    startRowInput: byId("startRowInput"), prevRowBtn: byId("prevRowBtn"), nextRowBtn: byId("nextRowBtn"),
    openWhatsAppBtn: byId("openWhatsAppBtn"), sendCurrentMessageBtn: byId("sendCurrentMessageBtn"),
    skipContactBtn: byId("skipContactBtn"), markManualBtn: byId("markManualBtn"),
    tabs: document.querySelectorAll(".tab"), tabPanels: document.querySelectorAll(".tab-panel")
  };
  function setStatus(text, type) { elements.statusElement.textContent = text; elements.statusElement.className = type || ""; }
  function setVersion() { elements.versionElement.textContent = "الإصدار: " + chrome.runtime.getManifest().version; }
  function setToolState(enabled) {
    const button = elements.toggleToolButton;
    button.textContent = enabled ? "إيقاف الأداة" : "تشغيل الأداة";
    button.className = enabled ? "warning" : "secondary";
    button.dataset.enabled = enabled ? "true" : "false";
  }
  function setActiveTab(tabName) {
    elements.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabName));
    elements.tabPanels.forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tabName));
  }
  window.PopupDom = { elements, setActiveTab, setStatus, setToolState, setVersion };
})();
