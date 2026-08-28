const webAppUrlInput=document.querySelector("#webAppUrl"),tokenInput=document.querySelector("#token"),sheetSelect=document.querySelector("#sheetName"),connectButton=document.querySelector("#connect"),saveButton=document.querySelector("#saveContact"),toggleToolButton=document.querySelector("#toggleTool"),statusElement=document.querySelector("#status"),versionElement=document.querySelector("#extensionVersion");
function setStatus(text,type){statusElement.textContent=text;statusElement.className=type||""}
function setVersion(){if(versionElement){versionElement.textContent="الإصدار: "+chrome.runtime.getManifest().version;}}
function setToolState(enabled){
  if(!toggleToolButton)return;
  toggleToolButton.textContent=enabled?"إيقاف الأداة":"تشغيل الأداة";
  toggleToolButton.className=enabled?"warning":"secondary";
  toggleToolButton.dataset.enabled=enabled?"true":"false";
}
function sendRuntimeMessage(message){return new Promise((resolve,reject)=>{chrome.runtime.sendMessage(message,response=>{if(chrome.runtime.lastError)return reject(new Error(chrome.runtime.lastError.message));if(!response||!response.ok)return reject(new Error(response&&response.error||"فشل الطلب."));resolve(response.data)})})}
function sendTabMessage(tabId,message){return new Promise((resolve,reject)=>{chrome.tabs.sendMessage(tabId,message,response=>{if(chrome.runtime.lastError)return reject(new Error("حدّث صفحة حراج ثم حاول مرة أخرى."));if(!response||!response.ok)return reject(new Error(response&&response.error||"تعذر قراءة الصفحة."));resolve(response)})})}
async function fillSheets(preferredSheet){
  const result=await sendRuntimeMessage({type:"GET_SHEETS"}),sheets=result.sheets||[];
  if(!sheets.length)throw new Error("لم أجد أي شيت متاح.");
  sheetSelect.replaceChildren(...sheets.map(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;return option}));
  const saved=(await chrome.storage.sync.get("sheetName")).sheetName,target=preferredSheet||saved;
  if(target&&sheets.includes(target))sheetSelect.value=target;
  await chrome.storage.sync.set({sheetName:sheetSelect.value});
}
async function initialize(){const settings=await chrome.storage.sync.get(["webAppUrl","token","sheetName","toolEnabled"]);webAppUrlInput.value=settings.webAppUrl||"";tokenInput.value=settings.token||"";setVersion();setToolState(settings.toolEnabled!==false);if(settings.webAppUrl&&settings.token){try{await fillSheets(settings.sheetName);setStatus("الاتصال جاهز.","success")}catch(error){setStatus(error.message,"error")}}}
connectButton.addEventListener("click",async()=>{connectButton.disabled=true;setStatus("جاري الاتصال...");try{await chrome.storage.sync.set({webAppUrl:webAppUrlInput.value.trim(),token:tokenInput.value.trim()});await fillSheets("");setStatus("تم الاتصال وجلب الشيتات.","success")}catch(error){setStatus(error.message,"error")}finally{connectButton.disabled=false}});
sheetSelect.addEventListener("change",()=>chrome.storage.sync.set({sheetName:sheetSelect.value}));
toggleToolButton.addEventListener("click",async()=>{const enabled=toggleToolButton.dataset.enabled!=="true";await chrome.storage.sync.set({toolEnabled:enabled});setToolState(enabled);setStatus(enabled?"تم تشغيل الأداة." : "تم إيقاف الأداة.",enabled?"success":"error");});
saveButton.addEventListener("click",async()=>{saveButton.disabled=true;setStatus("جاري فتح التواصل وقراءة الرقم...");try{const sheetName=sheetSelect.value;if(!sheetName)throw new Error("اختر الشيت أولاً.");const tabs=await chrome.tabs.query({active:true,currentWindow:true}),tab=tabs[0];if(!tab||!tab.id||!/^https:\/\/(?:[^/]+\.)?haraj\.com\.sa\//.test(tab.url||""))throw new Error("افتح إعلانًا في موقع حراج أولاً.");const contact=await sendTabMessage(tab.id,{type:"COLLECT_MOBILE"});setStatus("تم العثور على الرقم، جاري الحفظ...");const result=await sendRuntimeMessage({type:"SAVE_CONTACT",sheetName:sheetName,mobile:contact.mobile,sourceUrl:contact.sourceUrl});setStatus(result.duplicate?"الرقم "+result.mobile+" موجود مسبقًا في "+sheetName+".":"تم حفظ "+result.mobile+" في "+sheetName+".","success")}catch(error){setStatus(error.message,"error")}finally{saveButton.disabled=false}});
initialize();
