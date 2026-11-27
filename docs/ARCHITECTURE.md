# Architecture

Claude RTL is a Manifest V3 extension with three entry points, bundled by
esbuild from plain ES modules in `src/`.

```
                 chrome.storage.sync  (single source of truth for settings)
                 ▲          ▲           │ onChanged
          write  │          │ write     ▼
┌────────────────┴─┐  ┌─────┴────────────────┐  ┌──────────────────────────────┐
│ Popup            │  │ Service worker       │  │ Content script (claude.ai)   │
│ popup/popup.js   │  │ background/          │  │ content/index.js             │
│ settings UI      │  │ defaults, shortcut,  │  │ ├─ DirectionEngine → dir=""  │
│                  │  │ OFF badge            │  │ └─ StyleManager → <html>     │
└──────────────────┘  └──────────────────────┘  │       classes + CSS vars     │
                                                │ content.css (gated styles)   │
                                                └──────────────────────────────┘
```

There is no messaging between contexts: everything reacts to
`chrome.storage.onChanged`, which keeps every open tab, the popup and the
badge consistent automatically.

## Settings (`src/shared/settings.js`)

- `DEFAULT_SETTINGS` defines the schema.
- `sanitizeSettings()` coerces any stored value into a valid object (unknown
  keys dropped, enums checked, numbers clamped). Every read and write goes
  through it, so corrupted or outdated storage can never break the page.

## Direction detection (`src/shared/direction.js`)

The browser's `dir="auto"` uses the _first strong character_ rule: a Persian
sentence starting with "Claude" or "ChatGPT" would be treated as LTR. Instead,
`detectDirection()` counts letters (up to 600) and returns `rtl` when at least
30% belong to an RTL script (Arabic, Hebrew, Syriac, Thaana, N'Ko, …), `ltr`
otherwise, or `null` when there are no letters.

## DirectionEngine (`src/content/direction-engine.js`)

- Processes **blocks** (`p`, `li`, `ul`, `ol`, headings, `blockquote`, table
  cells, …) as defined in `selectors.js`.
- Skips anything inside `pre`, `code`, math, and the ProseMirror composer.
- claude.ai sets its own `dir` on message paragraphs using the first-strong
  rule (e.g. `<p dir="ltr">` for a Persian sentence starting with an English
  word). Inside message roots (`MESSAGE_ROOT_SELECTOR`) that value is
  overridden; elsewhere only `dir="auto"` is, and explicit page values are
  respected. Managed elements carry `data-crtl="<original dir>"`, so `stop()`
  restores the page exactly.
- A `MutationObserver` (childList, characterData and the `dir` attribute)
  queues affected blocks and their block ancestors. Watching `dir` lets us
  re-apply when React rewrites it mid-stream; applying is idempotent, so our
  own writes settle after one no-op pass. The queue is flushed once per
  animation frame; during streaming that's at most ~60 cheap passes per
  second regardless of how many tokens arrive.
- Blocks are processed parents-first. An LTR block inside an RTL ancestor gets
  an explicit `dir="ltr"` — except list items, which keep the list's `rtl` so
  their bullets stay inside the list, and are flagged `data-crtl-ltr-item` so
  CSS (`unicode-bidi: plaintext`) still orders their text as LTR.

## Composer

The message box is a ProseMirror editor, which owns its DOM; mutating it would
fight the editor. It is handled with CSS only:
`unicode-bidi: plaintext; text-align: start` aligns each paragraph by its own
content, live as you type.

## StyleManager & content.css

`StyleManager.apply(settings)` toggles classes (`crtl-on`, `crtl-font-messages`,
`crtl-scale`, …) and CSS variables on `<html>`. All visual rules in
`content.css` are scoped under those classes, so disabling the extension is
just removing them.

Bundled fonts are fetched from the extension as `ArrayBuffer`s and registered
with the `FontFace` API. Because no `url(chrome-extension://…)` is involved,
claude.ai's CSP `font-src` cannot block them.

## Build (`scripts/build.mjs`)

- esbuild bundles the three entries (`content.js` as IIFE, the others as ESM)
  targeting Chrome 116.
- Static files are copied; `manifest.json` gets its `version` from
  `package.json`, which is the single source of truth.
- `--zip` writes a reproducible ZIP (fixed timestamps, sorted entries) with a
  tiny built-in writer, so packaging works on every OS without extra tools.
