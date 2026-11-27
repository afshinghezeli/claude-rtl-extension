# Privacy Policy

_Last updated: 2026-11-27_

Claude RTL is built to be private by design.

## What the extension does

- It runs only on pages under `https://claude.ai/`.
- It changes the **presentation** of the page (text direction, font, size and
  line height) locally in your browser.

## What data is collected

**None.** Claude RTL does not collect, store, transmit, sell or share any
personal data, browsing history, or conversation content.

- No analytics, telemetry, tracking or advertising.
- No requests to any external server. Bundled fonts are loaded from inside the
  extension package itself.
- Page text is read only in memory, inside your browser, to decide whether a
  paragraph is right-to-left. It never leaves the page.

## What is stored

Your preferences (on/off, direction mode, font, size, line height) are saved
with `chrome.storage.sync`, which Chrome may synchronise across browsers where
you are signed in with the same account. Nothing else is stored. Uninstalling
the extension removes them.

## Permissions

| Permission                    | Why                                         |
| ----------------------------- | ------------------------------------------- |
| `storage`                     | Save your settings.                         |
| Content script on `claude.ai` | Apply text direction and fonts to the page. |

## Contact

Questions or concerns: open an issue at
https://github.com/afshinghezeli/claude-rtl-extension/issues.
