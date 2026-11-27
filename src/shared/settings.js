import { getFont, sanitizeFontName } from './fonts.js';

/**
 * @typedef {object} Settings
 * @property {boolean} enabled     Master switch.
 * @property {'auto' | 'rtl'} direction  Detect per block, or force RTL everywhere.
 * @property {boolean} rtlInput    Auto-direction for the message composer.
 * @property {string} fontFamily   Font id from `FONTS`.
 * @property {string} customFont   Name of a locally installed font (when fontFamily = "custom").
 * @property {'messages' | 'all'} fontScope  Where the font is applied.
 * @property {number} fontScale    Message text size in percent.
 * @property {number} lineHeight   Message line height; 0 keeps the site default.
 */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  direction: 'auto',
  rtlInput: true,
  fontFamily: 'vazirmatn',
  customFont: '',
  fontScope: 'messages',
  fontScale: 100,
  lineHeight: 0,
});

export const LIMITS = Object.freeze({
  fontScale: { min: 80, max: 150, step: 5 },
  lineHeight: { min: 1.2, max: 2.4, step: 0.1 },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/**
 * Coerce any (possibly stale or tampered) stored value into valid settings.
 *
 * @param {unknown} raw
 * @returns {Settings}
 */
export function sanitizeSettings(raw) {
  const input = raw && typeof raw === 'object' ? /** @type {Record<string, any>} */ (raw) : {};
  const d = DEFAULT_SETTINGS;

  const fontScale = Number(input.fontScale);
  const lineHeight = Number(input.lineHeight);

  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : d.enabled,
    direction: oneOf(input.direction, ['auto', 'rtl'], d.direction),
    rtlInput: typeof input.rtlInput === 'boolean' ? input.rtlInput : d.rtlInput,
    fontFamily: getFont(input.fontFamily) ? input.fontFamily : d.fontFamily,
    customFont: sanitizeFontName(input.customFont),
    fontScope: oneOf(input.fontScope, ['messages', 'all'], d.fontScope),
    fontScale: Number.isFinite(fontScale)
      ? Math.round(clamp(fontScale, LIMITS.fontScale.min, LIMITS.fontScale.max))
      : d.fontScale,
    lineHeight:
      Number.isFinite(lineHeight) && lineHeight > 0
        ? Math.round(clamp(lineHeight, LIMITS.lineHeight.min, LIMITS.lineHeight.max) * 10) / 10
        : 0,
  };
}

/** @returns {chrome.storage.StorageArea} */
const area = () => chrome.storage.sync;

/** @returns {Promise<Settings>} */
export async function loadSettings() {
  const stored = await area().get(DEFAULT_SETTINGS);
  return sanitizeSettings(stored);
}

/**
 * @param {Partial<Settings>} patch
 * @returns {Promise<Settings>}
 */
export async function saveSettings(patch) {
  const next = sanitizeSettings({ ...(await loadSettings()), ...patch });
  await area().set(next);
  return next;
}

/** @returns {Promise<Settings>} */
export async function resetSettings() {
  await area().set({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}

/**
 * Subscribe to settings changes from any context (popup, other tabs, shortcut).
 *
 * @param {(settings: Settings) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onSettingsChanged(callback) {
  const listener = (_changes, areaName) => {
    if (areaName !== 'sync') return;
    loadSettings().then(callback);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
