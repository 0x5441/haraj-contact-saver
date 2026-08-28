const webAppUrlInput=document.querySelector("#webAppUrl"),tokenInput=document.querySelector("#token"),sheetSelect=document.querySelector("#sheetName"),connectButton=document.querySelector("#connect"),saveButton=document.querySelector("#saveContact"),toggleToolButton=document.querySelector("#toggleTool"),statusElement=document.querySelector("#status"),versionElement=document.querySelector("#extensionVersion"),providerSheetName=document.querySelector("#providerSheetName"),phoneColumnSelect=document.querySelector("#phoneColumnSelect"),statusColumnSelect=document.querySelector("#statusColumnSelect"),lastContactColumnSelect=document.querySelector("#lastContactColumnSelect"),citySelect=document.querySelector("#citySelect"),serviceTypeSelect=document.querySelector("#serviceTypeSelect"),customServiceInput=document.querySelector("#customServiceInput"),templateSelect=document.querySelector("#templateSelect"),messageText=document.querySelector("#messageText"),currentRowValue=document.querySelector("#currentRowValue"),currentPhoneValue=document.querySelector("#currentPhoneValue"),remainingCountValue=document.querySelector("#remainingCountValue"),startRowInput=document.querySelector("#startRowInput"),saveStartRow=document.querySelector("#saveStartRow"),prevRowBtn=document.querySelector("#prevRowBtn"),nextRowBtn=document.querySelector("#nextRowBtn"),openWhatsAppBtn=document.querySelector("#openWhatsAppBtn"),writeMessageBtn=document.querySelector("#writeMessageBtn"),sendCurrentMessageBtn=document.querySelector("#sendCurrentMessageBtn"),retryContactBtn=document.querySelector("#retryContactBtn"),skipContactBtn=document.querySelector("#skipContactBtn"),markManualBtn=document.querySelector("#markManualBtn"),stopProcessBtn=document.querySelector("#stopProcessBtn"),tabs=document.querySelectorAll(".tab"),tabPanels=document.querySelectorAll(".tab-panel");

const CONTACT_STORAGE_KEY="contactWorkflow";

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
  const saved=(await chrome.storage.sync.get("sheetName")).sheetName,target=preferredSheet||saved;
  if(target&&sheets.includes(target))sheetSelect.value=target;
  if(providerSheetName.value!=="" && !sheets.includes(providerSheetName.value)){providerSheetName.value=sheets[0];}
  await chrome.storage.sync.set({sheetName:sheetSelect.value});
}
async function loadProviderColumns(){
  const sheetName=providerSheetName.value;
  if(!sheetName)return;
  try{
    const result=await sendRuntimeMessage({type:"GET_SHEET_COLUMNS",sheetName:sheetName});
    const columns=result.columns || [];
    [phoneColumnSelect,statusColumnSelect,lastContactColumnSelect].forEach(select=>select.replaceChildren(new Option("اختر", "")));
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
    updateProgressUi();
  }catch(error){setStatus(error.message,"error");}
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
function bindContactControls(){
  tabs.forEach(tab=>tab.addEventListener("click",()=>setActiveTab(tab.dataset.tab)));
  providerSheetName.addEventListener("change",async()=>{await saveContactSettings(); await loadProviderColumns();});
  phoneColumnSelect.addEventListener("change",saveContactSettings);
  statusColumnSelect.addEventListener("change",saveContactSettings);
  lastContactColumnSelect.addEventListener("change",saveContactSettings);
  citySelect.addEventListener("change",saveContactSettings);
  serviceTypeSelect.addEventListener("change",saveContactSettings);
  customServiceInput.addEventListener("input",saveContactSettings);
  templateSelect.addEventListener("change",saveContactSettings);
  messageText.addEventListener("input",saveContactSettings);
  startRowInput.addEventListener("change",saveContactSettings);
  saveStartRow.addEventListener("click",async()=>{await saveContactSettings(); setStatus("تم حفظ نقطة البداية.","success");});
  prevRowBtn.addEventListener("click",()=>{setStatus("انتقل إلى الصف السابق يدويًا من شاشة التواصل.","success");});
  nextRowBtn.addEventListener("click",()=>{setStatus("الانتقال إلى الصف التالي سيتم بعد اختيار صف أو تأكيد المستخدم.","success");});
  openWhatsAppBtn.addEventListener("click",async()=>{
    const url = "https://web.whatsapp.com/";
    try {
      const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
      if (tabs[0] && tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        await chrome.tabs.create({ url, active: true });
      }
      setStatus("افتح واتساب Web يدويًا، ثم اضغط زر 'التالي' بعد فتح محادثة جديدة.","success");
    } catch (error) {
      setStatus(error.message || "تعذر فتح واتساب Web.","error");
    }
  });
  writeMessageBtn.addEventListener("click",()=>{setStatus("اكتب الرسالة يدويًا داخل محادثة واتساب ثم اضغط 'إرسال الرسالة الحالية' بعد التأكد من النص.","success");});
  sendCurrentMessageBtn.addEventListener("click",()=>{setStatus("إرسال الرسالة يحتاج تأكيد المستخدم فقط بعد التحقق من الرقم ومحتوى الرسالة.","success");});
  retryContactBtn.addEventListener("click",()=>{setStatus("إعادة المحاولة مسموحة فقط بعد فشل واضح أو رقم غير مسجل في واتساب.","success");});
  skipContactBtn.addEventListener("click",()=>{setStatus("تم تسجيل هذا الرقم كـ تخطي يدوي، مع الاحتفاظ بالصف الحالي دون تكرار.","success");});
  markManualBtn.addEventListener("click",()=>{setStatus("تم تعليم هذا الرقم كـ إرسال يدوي، مع الحفاظ على نقطة التقدم الحالية.","success");});
  stopProcessBtn.addEventListener("click",()=>{setStatus("تم إيقاف العملية الحالية. لا يتم إرسال أي رقم آخر دون تأكيد جديد.","error");});
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
  if(providerSheetName.value){await loadProviderColumns();}
  updateProgressUi();
}
connectButton.addEventListener("click",async()=>{connectButton.disabled=true;setStatus("جاري الاتصال...");try{await chrome.storage.sync.set({webAppUrl:webAppUrlInput.value.trim(),token:tokenInput.value.trim()});await fillSheets("");setStatus("تم الاتصال وجلب الشيتات.","success")}catch(error){setStatus(error.message,"error")}finally{connectButton.disabled=false}});
sheetSelect.addEventListener("change",()=>chrome.storage.sync.set({sheetName:sheetSelect.value}));
toggleToolButton.addEventListener("click",async()=>{const enabled=toggleToolButton.dataset.enabled!=="true";await chrome.storage.sync.set({toolEnabled:enabled});setToolState(enabled);setStatus(enabled?"تم تشغيل الأداة." : "تم إيقاف الأداة.",enabled?"success":"error");});
saveButton.addEventListener("click",async()=>{saveButton.disabled=true;setStatus("جاري فتح التواصل وقراءة الرقم...");try{const sheetName=sheetSelect.value;if(!sheetName)throw new Error("اختر الشيت أولاً.");const tabs=await chrome.tabs.query({active:true,currentWindow:true}),tab=tabs[0];if(!tab||!tab.id||!/^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//.test(tab.url||""))throw new Error("افتح إعلانًا في موقع حراج أولاً.");const contact=await sendTabMessage(tab.id,{type:"COLLECT_MOBILE"});setStatus("تم العثور على الرقم، جاري الحفظ...");const result=await sendRuntimeMessage({type:"SAVE_CONTACT",sheetName:sheetName,mobile:contact.mobile,sourceUrl:contact.sourceUrl});setStatus(result.duplicate?"الرقم "+result.mobile+" موجود مسبقًا في "+sheetName+".":"تم حفظ "+result.mobile+" في "+sheetName+".","success")}catch(error){setStatus(error.message,"error")}finally{saveButton.disabled=false}});
initialize();
