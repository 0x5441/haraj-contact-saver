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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'WHATSAPP_OPEN_NEW_CHAT') {
    const button = WHATSAPP_SELECTORS.map(findVisibleSelector).find(Boolean);
    if (button) {
      button.click();
      return sendResponse({ ok: true, message: 'تم الضغط على New chat.' });
    }
    return sendResponse({ ok: false, error: 'لم أجد زر New chat في واتساب Web.' });
  }

  if (message.type === 'WHATSAPP_ENTER_NUMBER') {
    const number = String(message.number || '').trim();
    const input = Array.from(document.querySelectorAll('input, [contenteditable="true"], [role="textbox"], [data-testid]')).find((element) => {
      if (!isVisible(element)) return false;
      const role = element.getAttribute('role');
      const contentEditable = element.getAttribute('contenteditable');
      const aria = element.getAttribute('aria-label') || '';
      const dataTestId = element.getAttribute('data-testid') || '';
      if (aria.includes('New chat') || dataTestId.includes('drawer-title-body')) return false;
      if (role === 'textbox' || contentEditable === 'true' || element.tagName === 'INPUT') return true;
      return /search|chat|contact|phone/i.test(aria + dataTestId);
    });

    if (!input) {
      return sendResponse({ ok: false, error: 'لم أجد صندوق إدخال رقم في واتساب Web.' });
    }

    input.focus();
    input.value = number;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return sendResponse({ ok: true, message: 'تم إدخال الرقم في خانة البحث.' });
  }

  if (message.type === 'WHATSAPP_SEND_MESSAGE') {
    const button = Array.from(document.querySelectorAll('button, [role="button"], [data-testid]')).find((element) => {
      if (!isVisible(element)) return false;
      const dataTestId = element.getAttribute('data-testid') || '';
      const aria = element.getAttribute('aria-label') || '';
      return dataTestId.includes('wds-ic-send-filled') || /send/i.test(aria);
    });

    if (!button) {
      return sendResponse({ ok: false, error: 'لم أجد زر إرسال الرسالة في واتساب Web.' });
    }

    button.click();
    return sendResponse({ ok: true, message: 'تم الضغط على زر الإرسال.' });
  }

  return true;
});
