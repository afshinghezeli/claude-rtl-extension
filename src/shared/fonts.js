/**
 * Font catalog.
 *
 * Bundled fonts ship inside the extension (see `src/fonts/`, all SIL OFL 1.1)
 * so they work regardless of claude.ai's Content-Security-Policy.
 * To add a font: drop the .woff2 files + license into `src/fonts/<id>/`
 * and add an entry here. See CONTRIBUTING.md.
 */

/**
 * @typedef {object} FontFile
 * @property {string} path    Path relative to the extension root.
 * @property {string} weight  CSS font-weight value or range ("100 900").
 *
 * @typedef {object} FontDefinition
 * @property {string} id
 * @property {string} label        Human-readable name.
 * @property {'bundled' | 'system' | 'none' | 'custom'} source
 * @property {string} [family]     CSS family name registered/used on the page.
 * @property {string} [stack]      Full CSS font-family stack.
 * @property {FontFile[]} [files]
 */

const SANS_FALLBACK = 'Tahoma, "Segoe UI", system-ui, sans-serif';

/** @type {readonly FontDefinition[]} */
export const FONTS = Object.freeze([
  { id: 'default', label: 'Claude default', source: 'none' },
  {
    id: 'vazirmatn',
    label: 'Vazirmatn',
    source: 'bundled',
    family: 'CRTL Vazirmatn',
    files: [{ path: 'fonts/vazirmatn/Vazirmatn-Variable.woff2', weight: '100 900' }],
  },
  {
    id: 'shabnam',
    label: 'Shabnam',
    source: 'bundled',
    family: 'CRTL Shabnam',
    files: [
      { path: 'fonts/shabnam/Shabnam.woff2', weight: '400' },
      { path: 'fonts/shabnam/Shabnam-Bold.woff2', weight: '700' },
    ],
  },
  {
    id: 'sahel',
    label: 'Sahel',
    source: 'bundled',
    family: 'CRTL Sahel',
    files: [
      { path: 'fonts/sahel/Sahel.woff2', weight: '400' },
      { path: 'fonts/sahel/Sahel-Bold.woff2', weight: '700' },
    ],
  },
  {
    id: 'samim',
    label: 'Samim',
    source: 'bundled',
    family: 'CRTL Samim',
    files: [
      { path: 'fonts/samim/Samim.woff2', weight: '400' },
      { path: 'fonts/samim/Samim-Bold.woff2', weight: '700' },
    ],
  },
  { id: 'tahoma', label: 'Tahoma (system)', source: 'system', stack: `Tahoma, ${SANS_FALLBACK}` },
  {
    id: 'system',
    label: 'System UI',
    source: 'system',
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  { id: 'custom', label: 'Custom (installed font)', source: 'custom' },
]);

/** @param {string} id */
export function getFont(id) {
  return FONTS.find((font) => font.id === id);
}

/** Strip anything that is not a plausible font name, to keep CSS injection impossible. */
export function sanitizeFontName(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
}

/**
 * Resolve the CSS `font-family` stack for the given settings.
 *
 * @param {{ fontFamily: string, customFont: string }} settings
 * @returns {string | null} `null` means "do not override the site font".
 */
export function resolveFontStack({ fontFamily, customFont }) {
  const font = getFont(fontFamily);
  if (!font || font.source === 'none') return null;
  if (font.source === 'bundled') return `"${font.family}", ${SANS_FALLBACK}`;
  if (font.source === 'system') return font.stack ?? null;

  const name = sanitizeFontName(customFont);
  return name ? `"${name}", ${SANS_FALLBACK}` : null;
}
