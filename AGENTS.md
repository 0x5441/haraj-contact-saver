# Codex project rules

## Goal

Keep the extension easy to extend without changing its working behavior accidentally.

## Architecture boundaries

- Put reusable, DOM-free logic in `src/shared/` and cover it with Node tests.
- Put Google Apps Script HTTP communication only in `src/background/api-client.js`.
- Put background listeners and automatic Haraj saving only in `src/background/index.js`.
- Put Haraj page selectors and extraction only in `src/content/haraj/`.
- Put WhatsApp selectors and page automation only in `src/content/whatsapp/`.
- Put popup rendering helpers in `src/popup/dom.js`.
- Put Chrome message wrappers in `src/popup/chrome-bridge.js`.
- Keep `src/popup/app.js` as orchestration. Do not add page selectors or raw fetch calls there.

## Safety rules

- Never commit tokens, Apps Script deployment URLs, account data, or private sheet data.
- Never log tokens or URLs containing a token.
- Do not broaden host permissions to `<all_urls>`.
- Do not mark a WhatsApp message as sent unless the existing workflow reports success.
- Preserve the current sheet column order and keep the source ad URL as the final saved value.

## Required checks

Run before every commit:

```bash
npm run check
```

When changing selectors, also load the unpacked extension and manually test:

1. Save one Haraj contact.
2. Verify duplicate prevention.
3. Load sheet columns and rows.
4. Run one WhatsApp provider flow.
5. Confirm the sheet status update.

## Change policy

- Make structural refactors separately from new features.
- Keep commits small and scoped to one concern.
- Update `docs/architecture.md` when adding a new feature area.
- Update the manifest version only for a testable release candidate.
