import { getFont, resolveFontStack } from '../shared/fonts.js';

/**
 * Translates settings into classes + CSS custom properties on <html>.
 * All actual styling lives in content.css, gated by these classes, so
 * disabling the extension is a matter of removing them.
 */

export const CLASSES = Object.freeze({
  on: 'crtl-on',
  forceRtl: 'crtl-force-rtl',
  input: 'crtl-input',
  fontMessages: 'crtl-font-messages',
  fontAll: 'crtl-font-all',
  scale: 'crtl-scale',
  lineHeight: 'crtl-lh',
});

const VARS = Object.freeze({
  font: '--crtl-font-family',
  scale: '--crtl-font-scale',
  lineHeight: '--crtl-line-height',
});

/** @typedef {import('../shared/settings.js').Settings} Settings */

export class StyleManager {
  /** @type {Map<string, Promise<void>>} */
  #loadedFonts = new Map();

  /**
   * @param {object} [options]
   * @param {Document} [options.document]
   * @param {(path: string) => string} [options.resolveUrl]  Maps an extension path to a URL.
   */
  constructor({ document: doc = globalThis.document, resolveUrl } = {}) {
    this.document = doc;
    this.resolveUrl = resolveUrl ?? ((path) => chrome.runtime.getURL(path));
  }

  /** @param {Settings} settings */
  apply(settings) {
    const root = this.document.documentElement;
    const { classList, style } = root;

    if (!settings.enabled) {
      this.reset();
      return;
    }

    classList.add(CLASSES.on);
    classList.toggle(CLASSES.forceRtl, settings.direction === 'rtl');
    classList.toggle(CLASSES.input, settings.rtlInput);

    const stack = resolveFontStack(settings);
    classList.toggle(CLASSES.fontMessages, Boolean(stack) && settings.fontScope === 'messages');
    classList.toggle(CLASSES.fontAll, Boolean(stack) && settings.fontScope === 'all');
    if (stack) {
      style.setProperty(VARS.font, stack);
      this.#ensureFontLoaded(settings.fontFamily);
    } else {
      style.removeProperty(VARS.font);
    }

    const scaled = settings.fontScale !== 100;
    classList.toggle(CLASSES.scale, scaled);
    if (scaled) style.setProperty(VARS.scale, String(settings.fontScale / 100));
    else style.removeProperty(VARS.scale);

    const lh = settings.lineHeight > 0;
    classList.toggle(CLASSES.lineHeight, lh);
    if (lh) style.setProperty(VARS.lineHeight, String(settings.lineHeight));
    else style.removeProperty(VARS.lineHeight);
  }

  reset() {
    const root = this.document.documentElement;
    root.classList.remove(...Object.values(CLASSES));
    for (const name of Object.values(VARS)) root.style.removeProperty(name);
  }

  /**
   * Bundled fonts are fetched as bytes and registered through the FontFace API.
   * Going through ArrayBuffers (instead of `url(chrome-extension://…)`) means
   * the page's CSP `font-src` can never block them.
   */
  #ensureFontLoaded(fontId) {
    const font = getFont(fontId);
    if (!font || font.source !== 'bundled' || !font.files) return;
    if (this.#loadedFonts.has(font.id)) return;

    const family = /** @type {string} */ (font.family);
    const task = Promise.all(
      font.files.map(async ({ path, weight }) => {
        const response = await fetch(this.resolveUrl(path));
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
        const face = new FontFace(family, await response.arrayBuffer(), {
          weight,
          style: 'normal',
          display: 'swap',
        });
        await face.load();
        this.document.fonts.add(face);
      }),
    ).then(
      () => undefined,
      (error) => {
        this.#loadedFonts.delete(font.id); // allow a retry on next apply
        console.warn('[Claude RTL] Could not load font', font.label, error);
      },
    );

    this.#loadedFonts.set(font.id, task);
  }
}
