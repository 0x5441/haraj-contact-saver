const SPREADSHEET_ID = '1hZvE6-M2Xxw20zvMI20-pDOD_LMApc4yJ7_ELKl8q7E';
const SECRET_TOKEN = 'Haraj-2026-Sultan-9284';

function jsonResponse_(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)}
function authorize_(token){if(!token||token!==SECRET_TOKEN)throw new Error('رمز الحماية غير صحيح.');}

function normalizeMobile_(value){
  let mobile=String(value||'').replace(/[^\d+]/g,'').trim();
  if(!mobile)return null;
  if(mobile.startsWith('00966'))mobile='+966'+mobile.slice(5);
  if(mobile.startsWith('966'))mobile='+'+mobile;
  if(mobile.startsWith('05'))mobile='+966'+mobile.slice(1);
  if(!/^\+9665\d{8}$/.test(mobile))throw new Error('رقم الجوال غير صالح.');
  return mobile;
}

function cityFromSheetName_(sheetName){return sheetName.replace(/^وايت\s*ماء\s*/i,'').replace(/^مدينة\s*/i,'').trim()||sheetName}

function getSheetByName_(sheetName){
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(String(sheetName || ''));
  if(!sheet||sheet.isSheetHidden()) throw new Error('الشيت المحدد غير موجود.');
  return sheet;
}

function getHeaderRow_(sheet){
  const values = sheet.getDataRange().getValues();
  if(!values.length) return [];
  return values[0].map(value => String(value || '').trim());
}

function getSheetColumnIndex_(header, columnName){
  const index = header.findIndex(column => String(column || '').trim().toLowerCase() === String(columnName || '').trim().toLowerCase());
  if(index === -1) throw new Error('عمود غير موجود: ' + columnName);
  return index;
}

function doGet(e){
  try{
    authorize_(e.parameter.token);
    if(e.parameter.action==='sheets'){
      const sheets=SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().filter(sheet=>!sheet.isSheetHidden()).map(sheet=>sheet.getName());
      return jsonResponse_({ok:true,sheets:sheets});
    }
    if(e.parameter.action==='columns'){
      const sheet=getSheetByName_(e.parameter.sheetName);
      return jsonResponse_({ok:true,columns:getHeaderRow_(sheet)});
    }
    throw new Error('طلب غير معروف.');
  }catch(error){return jsonResponse_({ok:false,error:error.message})}
}

function doPost(e){
  const lock = LockService.getScriptLock();
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    authorize_(body.token);

    if(body.action === 'save'){
      const sheet = getSheetByName_(body.sheetName);
      const mobile = normalizeMobile_(body.mobile);
      lock.waitLock(10000);
      const lastRow = sheet.getLastRow();
      if(lastRow >= 2){
        const existing = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat().filter(Boolean).map(value => {
          try { return normalizeMobile_(value); } catch (_) { return String(value).trim(); }
        });
        if(existing.includes(mobile)) return jsonResponse_({ok:true,duplicate:true,mobile:mobile});
      }
      sheet.appendRow([cityFromSheetName_(sheet.getName()), mobile, '', String(body.sourceUrl || '')]);
      return jsonResponse_({ok:true,duplicate:false,mobile:mobile,row:sheet.getLastRow()});
    }

    if(body.action === 'rows'){
      const sheet = getSheetByName_(body.sheetName);
      const header = getHeaderRow_(sheet);
      const phoneIndex = getSheetColumnIndex_(header, body.phoneColumn || '');
      const rows = sheet.getDataRange().getValues();
      const filtered = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const phoneValue = row[phoneIndex];
        if(!phoneValue || String(phoneValue).trim() === '') continue;
        try { normalizeMobile_(phoneValue); } catch (_) { continue; }
        filtered.push({
          rowNumber: i + 1,
          phone: normalizeMobile_(phoneValue),
          status: row[body.statusColumn ? getSheetColumnIndex_(header, body.statusColumn) : 0] || '',
          lastContact: row[body.lastContactColumn ? getSheetColumnIndex_(header, body.lastContactColumn) : 0] || ''
        });
      }
      return jsonResponse_({ok:true,rows:filtered});
    }

    if(body.action === 'updateStatus'){
      const sheet = getSheetByName_(body.sheetName);
      const header = getHeaderRow_(sheet);
      const rowNumber = Number(body.rowNumber || 0);
      if(!rowNumber || rowNumber < 2) throw new Error('رقم الصف غير صالح.');
      const statusIndex = body.statusColumn ? getSheetColumnIndex_(header, body.statusColumn) : 0;
      const lastContactIndex = body.lastContactColumn ? getSheetColumnIndex_(header, body.lastContactColumn) : -1;
      const rowRange = sheet.getRange(rowNumber, 1, 1, header.length);
      const rowValues = rowRange.getValues()[0];
      rowValues[statusIndex] = body.status || rowValues[statusIndex] || '';
      if(lastContactIndex >= 0) rowValues[lastContactIndex] = body.lastContact || new Date().toISOString();
      rowRange.setValues([rowValues]);
      return jsonResponse_({ok:true,rowNumber:rowNumber,status:rowValues[statusIndex]});
    }

    throw new Error('طلب غير معروف.');
  }catch(error){return jsonResponse_({ok:false,error:error.message})}
  finally{if(lock.hasLock())lock.releaseLock()}
}
