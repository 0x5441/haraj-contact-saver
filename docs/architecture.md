# Architecture

## Runtime flow

```text
Popup -> Background API client -> Google Apps Script -> Google Sheets
  |              |
  |              +-> automatic Haraj save
  +-> Haraj content script
  +-> WhatsApp content script
```

## Directories

```text
src/
  shared/             Pure reusable logic
  background/         Chrome service worker and Apps Script client
  content/haraj/      Haraj DOM integration
  content/whatsapp/   WhatsApp Web DOM integration
  popup/              Extension popup UI and orchestration
apps-script/          Google Apps Script backend
tests/                DOM-free automated tests
```

## Adding a feature

- A new service or page integration gets its own folder under `src/content/`.
- New Google Sheets actions are added to `api-client.js` and `Code.gs` together.
- Data normalization and message-template logic belongs in `src/shared/core.js`.
- UI-only code belongs in `src/popup/`; it should communicate through message types rather than calling external APIs directly.

## Message contracts

Background API messages:

- `GET_SHEETS`
- `GET_SHEET_COLUMNS`
- `GET_ROWS`
- `UPDATE_ROW_STATUS`
- `SAVE_CONTACT`

Content-script messages:

- `COLLECT_MOBILE`
- `WHATSAPP_RUN_FLOW`
- the existing granular `WHATSAPP_*` inspection and action messages

Keep these names stable unless both sender and receiver are migrated in the same change.
