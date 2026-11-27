# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-11-28

### Fixed

- Persian/Arabic paragraphs that start with an English word stayed
  left-to-right: claude.ai sets its own first-strong-character `dir` on
  message paragraphs, which is now overridden inside messages (and restored
  when the extension is turned off).
- Re-apply the direction when claude.ai rewrites `dir` while streaming.
- RTL list items starting with an English word (e.g. "**Worklet:** …") were
  reordered left-to-right; the LTR text fix now only applies to items that
  are actually LTR.

## [1.0.0] - 2026-11-27

### Added

- Per-paragraph automatic RTL detection for Persian, Arabic, Hebrew, Urdu and
  other right-to-left scripts, robust to sentences that start with Latin words.
- "Always RTL" mode.
- Auto-direction for each line of the message composer.
- Code blocks, inline code and math always stay left-to-right.
- Live updates while responses stream.
- Bundled fonts: Vazirmatn, Shabnam, Sahel, Samim; system fonts; custom
  installed fonts.
- Font scope (messages or entire interface), text size and line height.
- Keyboard shortcut <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> and an "OFF" badge.
- Settings popup in English and Persian, light and dark themes.

[Unreleased]: https://github.com/afshinghezeli/claude-rtl-extension/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/afshinghezeli/claude-rtl-extension/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/afshinghezeli/claude-rtl-extension/releases/tag/v1.0.0
