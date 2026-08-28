const WHATSAPP_SELECTORS = [
  'button[data-tab="2"][aria-label="New chat"]',
  'button[aria-label="New chat"]',
  'button[aria-label*="New chat"]',
  'button[title="New chat"]'
];

function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function findVisibleSelector(selector) {
  return Array.from(document.querySelectorAll(selector)).find(isVisible) || null;
}

function findSearchInput() {
  return Array.from(document.querySelectorAll('input, [contenteditable="true"], [role="textbox"], [data-testid]')).find((element) => {
    if (!isVisible(element)) return false;
    const role = element.getAttribute('role');
    const contentEditable = element.getAttribute('contenteditable');
    const aria = (element.getAttribute('aria-label') || '').toLowerCase();
    const dataTestId = (element.getAttribute('data-testid') || '').toLowerCase();
    const tagName = (element.tagName || '').toLowerCase();
    if (aria.includes('new chat') || dataTestId.includes('drawer-title-body') || dataTestId.includes('chat-title')) return false;
    if (role === 'textbox' || contentEditable === 'true' || tagName === 'input') return true;
    return /search|chat|contact|phone|number/.test(aria + ' ' + dataTestId);
  }) || null;
}

function findMessageBox() {
  return Array.from(document.querySelectorAll('div[contenteditable="true"], p[contenteditable="true"], [role="textbox"], [data-testid]')).find((element) => {
    if (!isVisible(element)) return false;
    const dataTestId = (element.getAttribute('data-testid') || '').toLowerCase();
    const aria = (element.getAttribute('aria-label') || '').toLowerCase();
    const text = (element.textContent || '').trim();
    if (text === 'New chat' || dataTestId.includes('drawer-title-body')) return false;
    if (dataTestId.includes('send') || aria.includes('send')) return false;
    return element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox';
  }) || null;
}

function findSendButton() {
  return Array.from(document.querySelectorAll('button, [role="button"], [data-testid="wds-ic-send-filled"], [data-icon="wds-ic-send-filled"]')).find((element) => {
    if (!isVisible(element)) return false;
    const dataTestId = (element.getAttribute('data-testid') || '').toLowerCase();
    const dataIcon = (element.getAttribute('data-icon') || '').toLowerCase();
    const aria = (element.getAttribute('aria-label') || '').toLowerCase();
    return dataTestId.includes('wds-ic-send-filled') || dataIcon.includes('wds-ic-send-filled') || /send/.test(aria);
  }) || null;
}

function findContactResult() {
  return Array.from(document.querySelectorAll('span[title], div[title], [data-testid]')).find((element) => {
    if (!isVisible(element)) return false;
    const title = (element.getAttribute('title') || '').replace(/\s+/g, '');
    const text = (element.textContent || '').replace(/\s+/g, '');
    return /\+966|966|05/.test(title) || /\+966|966|05/.test(text);
  }) || null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'WHATSAPP_OPEN_NEW_CHAT') {
    const button = WHATSAPP_SELECTORS.map(findVisibleSelector).find(Boolean);
    if (!button) {
      return sendResponse({ ok: false, error: 'لم أجد زر New chat في واتساب Web. افتحه يدويًا ثم أعد المحاولة.' });
    }
    if (!message.confirm) {
      return sendResponse({ ok: false, needsUserConfirmation: true, message: 'يجب تأكيد المستخدم قبل الضغط على New chat.' });
    }
    button.click();
    return sendResponse({ ok: true, message: 'تم الضغط على New chat بعد تأكيد المستخدم.' });
  }

  if (message.type === 'WHATSAPP_FIND_INPUT') {
    const input = findSearchInput();
    if (!input) {
      return sendResponse({ ok: false, error: 'لم أجد صندوق البحث أو إدخال الرقم بعد فتح New chat.' });
    }
    return sendResponse({ ok: true, hasInput: true, inputLabel: input.getAttribute('aria-label') || input.getAttribute('data-testid') || 'textbox' });
  }

  if (message.type === 'WHATSAPP_ENTER_NUMBER') {
    const number = String(message.number || '').trim();
    const input = findSearchInput();
    if (!input) {
      return sendResponse({ ok: false, error: 'لم أجد صندوق إدخال رقم، تأكد من أنك فتحت New chat يدويًا.' });
    }
    if (!message.confirm) {
      return sendResponse({ ok: false, needsUserConfirmation: true, message: 'يجب أن يكتب المستخدم الرقم يدويًا ليتوافق مع سلوك واتساب الطبيعي.' });
    }

    input.focus();
    const digits = Number.isFinite(message.digitDelay) ? Array.from(number) : Array.from(number);
    digits.forEach((char, index) => {
      const evt = new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char });
      input.dispatchEvent(evt);
      if (index < digits.length - 1) {
        input.value = (input.value || '') + char;
      }
    });

    return sendResponse({ ok: true, message: 'تم إدخال الرقم بعد تأكيد المستخدم.' });
  }

  if (message.type === 'WHATSAPP_FIND_RESULT') {
    const match = findContactResult();
    return sendResponse({ ok: !!match, found: !!match, title: match ? (match.getAttribute('title') || match.textContent || '') : '' });
  }

  if (message.type === 'WHATSAPP_FIND_SEND_BUTTON') {
    const button = findSendButton();
    if (!button) {
      return sendResponse({ ok: false, error: 'لم أجد زر الإرسال في المحادثة الحالية.' });
    }
    return sendResponse({ ok: true, hasButton: true });
  }

  if (message.type === 'WHATSAPP_FIND_MESSAGE_BOX') {
    const box = findMessageBox();
    if (!box) {
      return sendResponse({ ok: false, error: 'لم أجد صندوق كتابة الرسالة داخل المحادثة.' });
    }
    return sendResponse({ ok: true, hasBox: true });
  }

  if (message.type === 'WHATSAPP_SEND_MESSAGE') {
    const button = findSendButton();
    if (!button) {
      return sendResponse({ ok: false, error: 'لم أجد زر إرسال الرسالة في واتساب Web.' });
    }
    if (!message.confirm) {
      return sendResponse({ ok: false, needsUserConfirmation: true, message: 'يجب تأكيد المستخدم قبل الضغط على زر الإرسال.' });
    }
    button.click();
    return sendResponse({ ok: true, message: 'تم الضغط على زر الإرسال بعد تأكيد المستخدم.' });
  }

  return true;
});
