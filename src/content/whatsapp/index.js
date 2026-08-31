const WHATSAPP_SELECTORS = [
  'button[data-tab="2"][aria-label="New chat"]',
  'button[aria-label="New chat"]',
  'button[aria-label*="New chat"]',
  'button[title="New chat"]'
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  const exact = document.querySelector('input[role="textbox"][aria-label="Search name, number or @username"]');
  if (exact && isVisible(exact)) return exact;

  const placeholder = document.querySelector('input[type="text"][placeholder="Search name, number or @username"]');
  if (placeholder && isVisible(placeholder)) return placeholder;

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
  const exact = document.querySelector('div[data-testid="conversation-compose-box-input"][role="textbox"][contenteditable="true"]');
  if (exact && isVisible(exact)) return exact;

  const ariaLabel = document.querySelector('div[role="textbox"][aria-label*="Type a message"][contenteditable="true"]');
  if (ariaLabel && isVisible(ariaLabel)) return ariaLabel;

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

function setMessageBoxText(text) {
  const box = findMessageBox();
  if (!box) return false;
  box.focus();
  if (box.isContentEditable) {
    box.textContent = text;
    box.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
    box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return true;
  }
  if (box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement) {
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
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
  const exact = document.querySelector('div[data-testid="cell-frame-title"] span[title^="+966"], div[data-testid="cell-frame-title"] span[title^="966"], div[data-testid="cell-frame-title"] span[title^="05"]');
  if (exact && isVisible(exact)) return exact;

  const container = document.querySelector('div[data-testid="cell-frame-title"]');
  if (container && isVisible(container)) return container;

  return Array.from(document.querySelectorAll('span[title], div[title], [data-testid]')).find((element) => {
    if (!isVisible(element)) return false;
    const title = (element.getAttribute('title') || '').replace(/\s+/g, '');
    const text = (element.textContent || '').replace(/\s+/g, '');
    return /\+966|966|05/.test(title) || /\+966|966|05/.test(text);
  }) || null;
}

async function runHumanWhatsAppFlow(number, messageText) {
  const newChatButton = WHATSAPP_SELECTORS.map(findVisibleSelector).find(Boolean);
  if (!newChatButton) {
    throw new Error('لم أجد زر New chat في واتساب Web.');
  }

  newChatButton.click();
  await wait(1400);

  const input = findSearchInput();
  if (!input) {
    throw new Error('لم أجد خانة إدخال رقم الهاتف بعد زر New chat.');
  }

  input.focus();
  if (input.isContentEditable) {
    input.textContent = number;
    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: number }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: number }));
  } else {
    input.value = number;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await wait(1800);

  const result = findContactResult();
  if (!result) {
    throw new Error('لم يظهر رقم الجوال في قائمة البحث بعد إدخاله.');
  }
  result.click();
  await wait(2000);

  const box = findMessageBox();
  if (!box) {
    throw new Error('لم أجد صندوق كتابة الرسالة بعد فتح المحادثة.');
  }

  box.focus();
  if (box.isContentEditable) {
    box.textContent = messageText;
    box.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: messageText }));
    box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: messageText }));
  } else if (box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement) {
    box.value = messageText;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await wait(1200);

  const sendButton = findSendButton();
  if (!sendButton) {
    throw new Error('لم أجد زر الإرسال في المحادثة الحالية.');
  }

  sendButton.click();
  await wait(1200);
  return { ok: true, message: 'تم فتح المحادثة، إدخال الرقم، كتابة الرسالة، وإرسالها بنجاح.' };
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
    if (input.isContentEditable) {
      input.textContent = number;
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: number }));
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: number }));
    } else {
      input.value = number;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return sendResponse({ ok: true, message: 'تم إدخال الرقم بعد تأكيد المستخدم.' });
  }

  if (message.type === 'WHATSAPP_SET_MESSAGE') {
    const text = String(message.text || '').trim();
    if (!text) {
      return sendResponse({ ok: false, error: 'لا يوجد نص رسالة جاهز.' });
    }
    if (!message.confirm) {
      return sendResponse({ ok: false, needsUserConfirmation: true, message: 'يجب تأكيد المستخدم قبل كتابة نص الرسالة.' });
    }
    const result = setMessageBoxText(text);
    return sendResponse({ ok: result, message: result ? 'تم كتابة نص الرسالة في المحادثة.' : 'لم أجد صندوق كتابة الرسالة داخل واتساب.' });
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

  if (message.type === 'WHATSAPP_RUN_FLOW') {
    const number = String(message.number || '').trim();
    const text = String(message.text || '').trim();
    if (!number) {
      return sendResponse({ ok: false, error: 'لا يوجد رقم للبحث في واتساب.' });
    }
    if (!text) {
      return sendResponse({ ok: false, error: 'لا يوجد نص رسالة لكتابته في واتساب.' });
    }
    runHumanWhatsAppFlow(number, text)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => sendResponse({ ok: false, error: error.message || 'فشل تشغيل سير واتساب.' }));
    return true;
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
