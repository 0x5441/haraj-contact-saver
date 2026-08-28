const webAppUrlInput=document.querySelector("#webAppUrl"),tokenInput=document.querySelector("#token"),sheetSelect=document.querySelector("#sheetName"),connectButton=document.querySelector("#connect"),saveButton=document.querySelector("#saveContact"),toggleToolButton=document.querySelector("#toggleTool"),statusElement=document.querySelector("#status"),versionElement=document.querySelector("#extensionVersion"),providerSheetName=document.querySelector("#providerSheetName"),phoneColumnSelect=document.querySelector("#phoneColumnSelect"),statusColumnSelect=document.querySelector("#statusColumnSelect"),lastContactColumnSelect=document.querySelector("#lastContactColumnSelect"),manualPhoneInput=document.querySelector("#manualPhoneInput"),citySelect=document.querySelector("#citySelect"),serviceTypeSelect=document.querySelector("#serviceTypeSelect"),customServiceInput=document.querySelector("#customServiceInput"),templateSelect=document.querySelector("#templateSelect"),messageText=document.querySelector("#messageText"),currentRowValue=document.querySelector("#currentRowValue"),currentPhoneValue=document.querySelector("#currentPhoneValue"),remainingCountValue=document.querySelector("#remainingCountValue"),startRowInput=document.querySelector("#startRowInput"),prevRowBtn=document.querySelector("#prevRowBtn"),nextRowBtn=document.querySelector("#nextRowBtn"),openWhatsAppBtn=document.querySelector("#openWhatsAppBtn"),sendCurrentMessageBtn=document.querySelector("#sendCurrentMessageBtn"),skipContactBtn=document.querySelector("#skipContactBtn"),markManualBtn=document.querySelector("#markManualBtn"),tabs=document.querySelectorAll(".tab"),tabPanels=document.querySelectorAll(".tab-panel");

const CONTACT_STORAGE_KEY="contactWorkflow";
let providerRows=[];
let providerRowIndex=0;
let currentProviderPhone="";
let currentProviderRowNumber=0;

function setStatus(text,type){statusElement.textContent=text;statusElement.className=type||""}
function setVersion(){if(versionElement){versionElement.textContent="الإصدار: "+chrome.runtime.getManifest().version;}}
function setToolState(enabled){
  if(!toggleToolButton)return;
  toggleToolButton.textContent=enabled?"إيقاف الأداة":"تشغيل الأداة";
  toggleToolButton.className=enabled?"warning":"secondary";
  toggleToolButton.dataset.enabled=enabled?"true":"false";
}
function setActiveTab(tabName){
  tabs.forEach(tab=>tab.classList.toggle("active",tab.dataset.tab===tabName));
  tabPanels.forEach(panel=>panel.classList.toggle("active",panel.dataset.panel===tabName));
}
function getProgressState(){return chrome.storage.local.get(CONTACT_STORAGE_KEY).then(result => result[CONTACT_STORAGE_KEY] || {});} 
function saveProgressState(state){return chrome.storage.local.set({[CONTACT_STORAGE_KEY]: state});}
function progressKey(){
  const spreadsheetId=String((chrome.storage.sync.get("spreadsheetId")||{}).spreadsheetId || "");
  const sheetName=providerSheetName.value||"";
  const phoneColumn=phoneColumnSelect.value||"";
  return [spreadsheetId,sheetName,phoneColumn].join("::");
}
function updateProgressUi(){
  if(!currentRowValue||!currentPhoneValue||!remainingCountValue)return;
  getProgressState().then(state=>{
    const key=progressKey();
    const current=state[key]||{row:1,phone:"-",remaining:0};
    currentRowValue.textContent=String(current.row||1);
    currentPhoneValue.textContent=current.phone||"-";
    remainingCountValue.textContent=String(current.remaining||0);
  });
}
function sendRuntimeMessage(message){return new Promise((resolve,reject)=>{chrome.runtime.sendMessage(message,response=>{if(chrome.runtime.lastError)return reject(new Error(chrome.runtime.lastError.message));if(!response||!response.ok)return reject(new Error(response&&response.error||"فشل الطلب."));resolve(response.data)})})}
function sendTabMessage(tabId,message){return new Promise((resolve,reject)=>{chrome.tabs.sendMessage(tabId,message,response=>{if(chrome.runtime.lastError)return reject(new Error("حدّث صفحة حراج ثم حاول مرة أخرى."));if(!response||!response.ok)return reject(new Error(response&&response.error||"تعذر قراءة الصفحة."));resolve(response)})})}
async function fillSheets(preferredSheet){
  const result=await sendRuntimeMessage({type:"GET_SHEETS"}),sheets=result.sheets||[];
  if(!sheets.length)throw new Error("لم أجد أي شيت متاح.");
  sheetSelect.replaceChildren(...sheets.map(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;return option}));
  providerSheetName.replaceChildren(...sheets.map(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;return option}));

  const saved=(await chrome.storage.sync.get("sheetName")).sheetName;
  const target=preferredSheet || saved || sheets[0];
  const selectedSheet = sheets.includes(target) ? target : sheets[0];

  sheetSelect.value = selectedSheet;
  providerSheetName.value = selectedSheet;
  await chrome.storage.sync.set({sheetName:selectedSheet});

  if (providerSheetName.value) {
    await loadProviderColumns();
  }
}
async function loadProviderColumns(){
  const sheetName=providerSheetName.value;
  if(!sheetName)return;
  try{
    const result=await sendRuntimeMessage({type:"GET_SHEET_COLUMNS",sheetName:sheetName});
    const columns=result.columns || [];
    console.log("Provider columns response:", {sheetName, columns});
    [phoneColumnSelect,statusColumnSelect,lastContactColumnSelect].forEach(select=>select.replaceChildren(new Option("اختر", "")));
    if(!columns.length){
      setStatus("الشيت موجود لكنه لا يحتوي على صف العناوين في الصف الأول. أضف أسماء الأعمدة في الصف الأول ثم أعد المحاولة.","error");
      return;
    }
    columns.forEach(col=>{
      const option = document.createElement("option");
      option.value = col;
      option.textContent = col;
      phoneColumnSelect.appendChild(option.cloneNode(true));
      statusColumnSelect.appendChild(option.cloneNode(true));
      lastContactColumnSelect.appendChild(option.cloneNode(true));
    });
    const saved = await chrome.storage.local.get("providerContactSettings");
    const settings = saved.providerContactSettings || {};
    if(settings.phoneColumn) phoneColumnSelect.value = settings.phoneColumn;
    if(settings.statusColumn) statusColumnSelect.value = settings.statusColumn;
    if(settings.lastContactColumn) lastContactColumnSelect.value = settings.lastContactColumn;
    setStatus("تم جلب أعمدة الشيت بنجاح.","success");
    updateProgressUi();
  }catch(error){console.error("loadProviderColumns error:", error); setStatus(error.message,"error");}
}
async function saveContactSettings(){
  const settings={
    sheetName:providerSheetName.value,
    phoneColumn:phoneColumnSelect.value,
    statusColumn:statusColumnSelect.value,
    lastContactColumn:lastContactColumnSelect.value,
    city: citySelect.value,
    serviceType: serviceTypeSelect.value,
    customService: customServiceInput.value.trim(),
    template: templateSelect.value,
    message: messageText.value,
    startRow: Number(startRowInput.value || 1)
  };
  await chrome.storage.local.set({providerContactSettings:settings});
  setStatus("تم حفظ إعدادات التواصل.","success");
}
function buildProviderMessage(){
  const city = citySelect.value || "المدينة";
  const service = (serviceTypeSelect.value && serviceTypeSelect.value !== "خدمة أخرى") ? serviceTypeSelect.value : (customServiceInput.value.trim() || "الخدمة");
  const phone = currentProviderPhone || currentPhoneValue.textContent || "";
  const text = messageText.value || "";
  return text
    .replace(/\{المدينة\}/gi, city)
    .replace(/\{الخدمة\}/gi, service)
    .replace(/\{نوع_الخدمة\}/gi, service)
    .replace(/\{الرقم\}/gi, phone);
}
async function loadProviderRows(){
  const sheetName = providerSheetName.value;
  const phoneColumn = phoneColumnSelect.value;
  const statusColumn = statusColumnSelect.value;
  const lastContactColumn = lastContactColumnSelect.value;
  if (!sheetName || !phoneColumn) return [];
  const result = await sendRuntimeMessage({ type: "GET_ROWS", sheetName, phoneColumn, statusColumn, lastContactColumn });
  providerRows = (result && result.rows) || [];
  providerRowIndex = 0;
  if (providerRows.length) {
    currentProviderRowNumber = providerRows[0].rowNumber;
    currentProviderPhone = providerRows[0].phone;
    currentPhoneValue.textContent = currentProviderPhone;
    currentRowValue.textContent = String(currentProviderRowNumber);
    remainingCountValue.textContent = String(Math.max(providerRows.length - 1, 0));
  } else {
    currentProviderRowNumber = 0;
    currentProviderPhone = "";
    currentPhoneValue.textContent = "-";
    currentRowValue.textContent = "0";
    remainingCountValue.textContent = "0";
  }
  return providerRows;
}
function setCurrentProviderRow(index){
  if (!providerRows.length) return;
  const safeIndex = Math.max(0, Math.min(index, providerRows.length - 1));
  providerRowIndex = safeIndex;
  currentProviderRowNumber = providerRows[safeIndex].rowNumber;
  currentProviderPhone = providerRows[safeIndex].phone;
  currentPhoneValue.textContent = currentProviderPhone;
  currentRowValue.textContent = String(currentProviderRowNumber);
  remainingCountValue.textContent = String(Math.max(providerRows.length - safeIndex - 1, 0));
}
async function markCurrentRow(statusValue, noteText){
  if (!currentProviderRowNumber || !providerSheetName.value) return;
  const statusColumn = statusColumnSelect.value || "الحالة";
  const lastContactColumn = lastContactColumnSelect.value || "آخر تواصل";
  await sendRuntimeMessage({
    type: "UPDATE_ROW_STATUS",
    sheetName: providerSheetName.value,
    rowNumber: currentProviderRowNumber,
    statusColumn,
    lastContactColumn,
    status: statusValue,
    lastContact: new Date().toISOString()
  });
  if (typeof noteText === "string" && noteText.trim()) {
    setStatus(noteText, "success");
  }
  await loadProviderRows();
}
async function goToNextProviderRow(step){
  if (!providerRows.length) {
    await loadProviderRows();
  }
  if (!providerRows.length) {
    setStatus("لا توجد أرقام متبقية في هذا الشيت.", "success");
    return;
  }
  const nextIndex = Math.max(0, Math.min(providerRowIndex + step, providerRows.length - 1));
  setCurrentProviderRow(nextIndex);
  setStatus("الرقم الحالي: " + currentProviderPhone, "success");
}
async function startCurrentProviderWorkflow(){
  if (!providerSheetName.value || !phoneColumnSelect.value) {
    setStatus("اختر الشيت والعمود المناسب أولاً.", "error");
    return;
  }
  if (!providerRows.length) {
    await loadProviderRows();
  }
  if (!providerRows.length) {
    setStatus("لا توجد أرقام للارسال في هذا الشيت.", "error");
    return;
  }
  setCurrentProviderRow(providerRowIndex);
  const messageTextPrepared = buildProviderMessage();
  const url = "https://web.whatsapp.com/";
  try {
    const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
    if (tabs[0] && tabs[0].id) {
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url, active: true });
    }
    const targetTab = (await chrome.tabs.query({ url: "https://web.whatsapp.com/*" }))[0];
    if (!targetTab || !targetTab.id) throw new Error("تعذر فتح واتساب Web.");
    setStatus("جاري فتح محادثة جديدة والبحث عن الرقم ...", "success");
    await chrome.tabs.sendMessage(targetTab.id, { type: "WHATSAPP_RUN_FLOW", number: currentProviderPhone, text: messageTextPrepared, confirm: true });
    setStatus("تم إرسال الرقم والرسالة في واتساب بنجاح، الآن تحقق من الرسالة واضغط التالي إذا كانت مرتبة.", "success");
    await markCurrentRow("تم الارسال", "تم تحديث حالة الرقم الحالي إلى تم الارسال.");
    if (providerRows.length) {
      providerRowIndex = Math.min(providerRows.length - 1, providerRowIndex + 1);
      setCurrentProviderRow(providerRowIndex);
    }
  } catch (error) {
    console.error("startCurrentProviderWorkflow error:", error);
    setStatus(error.message || "تعذر تجهيز واتساب.", "error");
  }
}
function bindContactControls(){
  tabs.forEach(tab=>tab.addEventListener("click",()=>setActiveTab(tab.dataset.tab)));
  providerSheetName.addEventListener("change",async()=>{await saveContactSettings(); await loadProviderColumns(); await loadProviderRows();});
  phoneColumnSelect.addEventListener("change",async()=>{await saveContactSettings(); await loadProviderRows();});
  statusColumnSelect.addEventListener("change",saveContactSettings);
  lastContactColumnSelect.addEventListener("change",saveContactSettings);
  manualPhoneInput.addEventListener("change",()=>{ if (manualPhoneInput.value.trim()) { currentProviderPhone = manualPhoneInput.value.trim(); currentPhoneValue.textContent = currentProviderPhone; setStatus("تم تعديل الرقم الحالي يدويًا.", "success"); } });
  citySelect.addEventListener("change",saveContactSettings);
  serviceTypeSelect.addEventListener("change",saveContactSettings);
  customServiceInput.addEventListener("input",saveContactSettings);
  templateSelect.addEventListener("change",saveContactSettings);
  messageText.addEventListener("input",saveContactSettings);
  startRowInput.addEventListener("change",saveContactSettings);
  prevRowBtn.addEventListener("click",async()=>{ if (!providerRows.length) await loadProviderRows(); if (providerRows.length) { providerRowIndex = Math.max(0, providerRowIndex - 1); setCurrentProviderRow(providerRowIndex); setStatus("الرقم الحالي: " + currentProviderPhone, "success"); } });
  nextRowBtn.addEventListener("click",async()=>{ if (!providerRows.length) await loadProviderRows(); if (providerRows.length) { providerRowIndex = Math.min(providerRows.length - 1, providerRowIndex + 1); setCurrentProviderRow(providerRowIndex); setStatus("الرقم الحالي: " + currentProviderPhone, "success"); } });
  openWhatsAppBtn.addEventListener("click", startCurrentProviderWorkflow);
  sendCurrentMessageBtn.addEventListener("click",async()=>{ await markCurrentRow("تم الارسال", "تم تحديث حالة الرقم الحالي إلى تم الارسال."); providerRowIndex = Math.min(providerRows.length - 1, providerRowIndex + 1); if (providerRows.length) setCurrentProviderRow(providerRowIndex); });
  skipContactBtn.addEventListener("click",async()=>{ await markCurrentRow("تخطي", "تم تخطي الرقم الحالي وتركه بدون تكرار."); providerRowIndex = Math.min(providerRows.length - 1, providerRowIndex + 1); if (providerRows.length) setCurrentProviderRow(providerRowIndex); });
  markManualBtn.addEventListener("click",async()=>{ if (!manualPhoneInput.value.trim()) { setStatus("اكتب رقمًا يدويًا أولاً ثم اضغط تعديل يدوي.", "error"); return; } currentProviderPhone = manualPhoneInput.value.trim(); currentPhoneValue.textContent = currentProviderPhone; setStatus("تم تعديل الرقم الحالي يدويًا، يمكنك البدء من جديد في واتساب.", "success"); });
}
async function initialize(){
  const settings=await chrome.storage.sync.get(["webAppUrl","token","sheetName","toolEnabled"]);
  webAppUrlInput.value=settings.webAppUrl||"";
  tokenInput.value=settings.token||"";
  setVersion();
  setToolState(settings.toolEnabled!==false);
  bindContactControls();
  const localSettings = await chrome.storage.local.get("providerContactSettings");
  const providerSettings = localSettings.providerContactSettings || {};
  if(providerSettings.sheetName) providerSheetName.value = providerSettings.sheetName;
  if(providerSettings.city) citySelect.value = providerSettings.city;
  if(providerSettings.serviceType) serviceTypeSelect.value = providerSettings.serviceType;
  if(providerSettings.customService) customServiceInput.value = providerSettings.customService;
  if(providerSettings.message) messageText.value = providerSettings.message;
  if(providerSettings.startRow) startRowInput.value = providerSettings.startRow;
  if(providerSettings.template) templateSelect.value = providerSettings.template;
  if(settings.webAppUrl&&settings.token){
    try{await fillSheets(settings.sheetName);setStatus("الاتصال جاهز.","success");}catch(error){setStatus(error.message,"error");}
  }
  if(!providerSheetName.value && sheetSelect.value){
    providerSheetName.value = sheetSelect.value;
  }
  if(providerSheetName.value){
    await loadProviderColumns();
    await loadProviderRows();
  }
  updateProgressUi();
}
connectButton.addEventListener("click",async()=>{connectButton.disabled=true;setStatus("جاري الاتصال...");try{await chrome.storage.sync.set({webAppUrl:webAppUrlInput.value.trim(),token:tokenInput.value.trim()});await fillSheets("");setStatus("تم الاتصال وجلب الشيتات.","success")}catch(error){setStatus(error.message,"error")}finally{connectButton.disabled=false}});
sheetSelect.addEventListener("change",()=>chrome.storage.sync.set({sheetName:sheetSelect.value}));
toggleToolButton.addEventListener("click",async()=>{const enabled=toggleToolButton.dataset.enabled!=="true";await chrome.storage.sync.set({toolEnabled:enabled});setToolState(enabled);setStatus(enabled?"تم تشغيل الأداة." : "تم إيقاف الأداة.",enabled?"success":"error");});
saveButton.addEventListener("click",async()=>{saveButton.disabled=true;setStatus("جاري فتح التواصل وقراءة الرقم...");try{const sheetName=sheetSelect.value;if(!sheetName)throw new Error("اختر الشيت أولاً.");const tabs=await chrome.tabs.query({active:true,currentWindow:true}),tab=tabs[0];if(!tab||!tab.id||!/^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//.test(tab.url||""))throw new Error("افتح إعلانًا في موقع حراج أولاً.");const contact=await sendTabMessage(tab.id,{type:"COLLECT_MOBILE"});setStatus("تم العثور على الرقم، جاري الحفظ...");const result=await sendRuntimeMessage({type:"SAVE_CONTACT",sheetName:sheetName,mobile:contact.mobile,sourceUrl:contact.sourceUrl});setStatus(result.duplicate?"الرقم "+result.mobile+" موجود مسبقًا في "+sheetName+".":"تم حفظ "+result.mobile+" في "+sheetName+".","success")}catch(error){setStatus(error.message,"error")}finally{saveButton.disabled=false}});
initialize();
