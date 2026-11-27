# Contributing to Claude RTL

Thanks for taking the time to contribute! 🎉 Every kind of help is welcome:
bug reports, fixes, new fonts, translations, documentation and ideas.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of contents

- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Development setup](#development-setup)
- [Making changes](#making-changes)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Common contributions](#common-contributions)

## Reporting bugs

1. Search [existing issues](https://github.com/afshinghezeli/claude-rtl-extension/issues) first.
2. Open a [bug report](https://github.com/afshinghezeli/claude-rtl-extension/issues/new?template=bug_report.yml)
   with your browser and extension version, steps to reproduce, and a
   screenshot if possible. Please **remove any private content** from screenshots.

Security issues: please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Suggesting features

Open a [feature request](https://github.com/afshinghezeli/claude-rtl-extension/issues/new?template=feature_request.yml)
describing the problem you want solved. For larger changes, please discuss
the approach in an issue before opening a pull request.

## Development setup

Requirements: **Node.js 22.2+** (see `.nvmrc`) and a Chromium-based browser.

```bash
git clone https://github.com/<your-username>/claude-rtl-extension.git
cd claude-rtl-extension
npm install
npm run dev
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**
and select the `dist/` folder.

- Content script / CSS changes: reload the claude.ai tab.
- Manifest / background changes: click the reload icon on the extension card.

## Making changes

- Source code lives in `src/` as ES modules; esbuild bundles it into `dist/`.
- Keep the extension **dependency-free at runtime** and permissions minimal.
- Add or update tests in `tests/` for logic changes.
- Run the full check before pushing — it is what CI runs:

  ```bash
  npm run check   # lint + format check + tests + build
  ```

- Formatting is handled by Prettier (`npm run format`); ESLint catches bugs (`npm run lint`).

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(popup): add line-height slider
fix(content): keep inline code LTR inside RTL lists
docs: explain custom fonts
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

## Pull requests

1. Fork the repo and create a branch from `main` (`git checkout -b fix/list-markers`).
2. Make your change with tests, and run `npm run check`.
3. Update `CHANGELOG.md` under **Unreleased** for user-facing changes.
4. Open a pull request and fill in the template. Include before/after
   screenshots for visual changes.

A maintainer will review it as soon as possible. Small, focused PRs are merged fastest.

## Common contributions

### Claude changed its layout and something broke

All knowledge about claude.ai's markup is in two places:

- [`src/content/selectors.js`](src/content/selectors.js) — which elements are processed or skipped.
- The message-root selectors at the top of [`src/content/content.css`](src/content/content.css).

Use DevTools to find the new element (prefer `data-testid` attributes and
semantic tags over generated class names), update the selectors, and describe
what changed in the PR.

### Adding a bundled font

1. The font **must** be under a license that allows redistribution (SIL OFL is ideal).
2. Add `.woff2` files and the license as `src/fonts/<id>/OFL.txt`.
3. Add an entry to `FONTS` in [`src/shared/fonts.js`](src/shared/fonts.js).
4. Add `@font-face` rules to [`src/popup/popup.css`](src/popup/popup.css) for the preview.
5. Add a `font_<id>` message to every file in `src/_locales/`.
6. Add a row to [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Tests verify that font files, licenses and translations exist.

### Adding a translation

1. Copy `src/_locales/en/messages.json` to `src/_locales/<code>/messages.json`
   (use a [Chrome locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)).
2. Translate the `message` values (keep the keys; `description` fields are optional).
3. Keep `extName` ≤ 75 and `extDescription` ≤ 132 characters.
4. Run `npm test` — it checks that every locale has the same keys as English.

## Releasing (maintainers)

See [docs/RELEASING.md](docs/RELEASING.md).
