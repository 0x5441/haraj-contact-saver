const SPREADSHEET_ID = '1hZvE6-M2Xxw20zvMI20-pDOD_LMApc4yJ7_ELKl8q7E';
const SECRET_TOKEN = 'غيّر-هذا-الرمز-إلى-رمز-طويل-وسري';
function jsonResponse_(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)}
function authorize_(token){if(!token||token!==SECRET_TOKEN)throw new Error('رمز الحماية غير صحيح.')}
function doGet(e){
  try{
    authorize_(e.parameter.token);
    if(e.parameter.action!=='sheets')throw new Error('طلب غير معروف.');
    const sheets=SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().filter(sheet=>!sheet.isSheetHidden()).map(sheet=>sheet.getName());
    return jsonResponse_({ok:true,sheets:sheets});
  }catch(error){return jsonResponse_({ok:false,error:error.message})}
}
function normalizeMobile_(value){
  let mobile=String(value||'').replace(/[^\d+]/g,'');
  if(mobile.startsWith('00966'))mobile='+966'+mobile.slice(5);
  if(mobile.startsWith('966'))mobile='+'+mobile;
  if(mobile.startsWith('05'))mobile='+966'+mobile.slice(1);
  if(!/^\+9665\d{8}$/.test(mobile))throw new Error('رقم الجوال غير صالح.');
  return mobile;
}
function cityFromSheetName_(sheetName){return sheetName.replace(/^وايت\s*ماء\s*/i,'').replace(/^مدينة\s*/i,'').trim()||sheetName}
function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    const body=JSON.parse(e.postData.contents||'{}');
    authorize_(body.token);
    if(body.action!=='save')throw new Error('طلب غير معروف.');
    const spreadsheet=SpreadsheetApp.openById(SPREADSHEET_ID),sheet=spreadsheet.getSheetByName(String(body.sheetName||''));
    if(!sheet||sheet.isSheetHidden())throw new Error('الشيت المحدد غير موجود.');
    const mobile=normalizeMobile_(body.mobile);
    lock.waitLock(10000);
    const lastRow=sheet.getLastRow();
    if(lastRow>=2){
      const existing=sheet.getRange(2,2,lastRow-1,1).getDisplayValues().flat().filter(Boolean).map(value=>{try{return normalizeMobile_(value)}catch(_){return String(value).trim()}});
      if(existing.includes(mobile))return jsonResponse_({ok:true,duplicate:true,mobile:mobile});
    }
    sheet.appendRow([cityFromSheetName_(sheet.getName()),mobile,'',String(body.sourceUrl||'')]);
    return jsonResponse_({ok:true,duplicate:false,mobile:mobile,row:sheet.getLastRow()});
  }catch(error){return jsonResponse_({ok:false,error:error.message})}
  finally{if(lock.hasLock())lock.releaseLock()}
}
