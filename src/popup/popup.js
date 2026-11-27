import { FONTS, resolveFontStack } from '../shared/fonts.js';
import {
  LIMITS,
  loadSettings,
  onSettingsChanged,
  resetSettings,
  saveSettings,
} from '../shared/settings.js';

/** @typedef {import('../shared/settings.js').Settings} Settings */

const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const t = (key, fallback = '') => chrome.i18n.getMessage(key) || fallback;

const els = {
  enabled: /** @type {HTMLInputElement} */ ($('enabled')),
  status: $('status'),
  directionHint: $('direction-hint'),
  rtlInput: /** @type {HTMLInputElement} */ ($('rtlInput')),
  fontFamily: /** @type {HTMLSelectElement} */ ($('fontFamily')),
  customFontField: $('customFontField'),
  customFont: /** @type {HTMLInputElement} */ ($('customFont')),
  fontScale: /** @type {HTMLInputElement} */ ($('fontScale')),
  fontScaleValue: $('fontScaleValue'),
  lineHeight: /** @type {HTMLInputElement} */ ($('lineHeight')),
  lineHeightValue: $('lineHeightValue'),
  preview: $('preview'),
  reset: $('reset'),
  version: $('version'),
};

/* ------------------------------------------------------------------ */
/* Static setup                                                        */
/* ------------------------------------------------------------------ */

function localize() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.documentElement.dir = t('@@bidi_dir', 'ltr');

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const message = t(/** @type {HTMLElement} */ (el).dataset.i18n ?? '');
    if (message) el.textContent = message;
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const message = t(/** @type {HTMLElement} */ (el).dataset.i18nPlaceholder ?? '');
    if (message) el.setAttribute('placeholder', message);
  }
}

function buildFontOptions() {
  for (const font of FONTS) {
    const option = document.createElement('option');
    option.value = font.id;
    option.textContent = t(`font_${font.id}`, font.label);
    els.fontFamily.append(option);
  }
}

function configureRanges() {
  // The line-height slider uses its minimum - step as "site default" (0).
  const { fontScale, lineHeight } = LIMITS;
  Object.assign(els.fontScale, {
    min: String(fontScale.min),
    max: String(fontScale.max),
    step: String(fontScale.step),
  });
  Object.assign(els.lineHeight, {
    min: String(Math.round((lineHeight.min - lineHeight.step) * 10) / 10),
    max: String(lineHeight.max),
    step: String(lineHeight.step),
  });
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

/** @param {Settings} s */
function render(s) {
  els.enabled.checked = s.enabled;
  document.body.classList.toggle('is-disabled', !s.enabled);
  els.status.textContent = s.enabled
    ? t('statusOn', 'Active on claude.ai')
    : t('statusOff', 'Paused');

  setRadio('direction', s.direction);
  els.directionHint.textContent =
    s.direction === 'auto'
      ? t('directionAutoHint', 'Each paragraph follows its own language.')
      : t('directionRtlHint', 'Every message is shown right-to-left.');
  els.rtlInput.checked = s.rtlInput;

  els.fontFamily.value = s.fontFamily;
  els.customFontField.hidden = s.fontFamily !== 'custom';
  if (document.activeElement !== els.customFont) els.customFont.value = s.customFont;
  setRadio('fontScope', s.fontScope);

  els.fontScale.value = String(s.fontScale);
  els.fontScaleValue.textContent = `${s.fontScale}%`;

  els.lineHeight.value = String(s.lineHeight || els.lineHeight.min);
  els.lineHeightValue.textContent = s.lineHeight
    ? s.lineHeight.toFixed(1)
    : t('lineHeightDefault', 'Default');

  renderPreview(s);
}

/** @param {Settings} s */
function renderPreview(s) {
  const stack = resolveFontStack(s);
  els.preview.style.fontFamily = stack ?? '';
  els.preview.style.setProperty('--preview-scale', String(s.fontScale / 100));
  if (s.lineHeight) els.preview.style.setProperty('--preview-line-height', String(s.lineHeight));
  else els.preview.style.removeProperty('--preview-line-height');
  els.preview.dir = s.direction === 'rtl' ? 'rtl' : 'auto';
}

function setRadio(name, value) {
  const input = /** @type {HTMLInputElement | null} */ (
    document.querySelector(`input[name="${name}"][value="${value}"]`)
  );
  if (input) input.checked = true;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

let saveTimer = 0;

/** Sliders and text inputs fire rapidly; storage.sync has write quotas. */
function saveDebounced(patch) {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveSettings(patch).then(render), 250);
}

function bindEvents() {
  els.enabled.addEventListener('change', () => save({ enabled: els.enabled.checked }));
  els.rtlInput.addEventListener('change', () => save({ rtlInput: els.rtlInput.checked }));
  els.fontFamily.addEventListener('change', () => {
    save({ fontFamily: els.fontFamily.value });
    if (els.fontFamily.value === 'custom') els.customFont.focus();
  });

  for (const name of ['direction', 'fontScope']) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      input.addEventListener('change', (event) => {
        save({ [name]: /** @type {HTMLInputElement} */ (event.target).value });
      });
    }
  }

  els.customFont.addEventListener('input', () =>
    saveDebounced({ customFont: els.customFont.value }),
  );

  els.fontScale.addEventListener('input', () => {
    els.fontScaleValue.textContent = `${els.fontScale.value}%`;
    saveDebounced({ fontScale: Number(els.fontScale.value) });
  });

  els.lineHeight.addEventListener('input', () => {
    const value = Number(els.lineHeight.value);
    const isDefault = value < LIMITS.lineHeight.min;
    els.lineHeightValue.textContent = isDefault
      ? t('lineHeightDefault', 'Default')
      : value.toFixed(1);
    saveDebounced({ lineHeight: isDefault ? 0 : value });
  });

  els.reset.addEventListener('click', async () => render(await resetSettings()));
}

/** @param {Partial<Settings>} patch */
async function save(patch) {
  render(await saveSettings(patch));
}

/* ------------------------------------------------------------------ */

async function main() {
  localize();
  buildFontOptions();
  configureRanges();
  els.version.textContent = `v${chrome.runtime.getManifest().version}`;

  render(await loadSettings());
  bindEvents();
  onSettingsChanged(render); // e.g. keyboard shortcut while the popup is open
}

main();
