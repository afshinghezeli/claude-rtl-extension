/**
 * Text direction detection.
 *
 * The browser's built-in `dir="auto"` uses the "first strong character" rule,
 * which fails for very common RTL sentences that start with a Latin word
 * (e.g. "Claude یک دستیار هوش مصنوعی است"). Instead we count letters and pick
 * RTL when a meaningful share of them belong to a right-to-left script.
 */

const RTL_SCRIPT =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]/u;

const LETTER = /\p{L}/u;

/** Share of RTL letters at or above which a block is considered RTL. */
export const DEFAULT_RTL_THRESHOLD = 0.3;

/** Only the first N letters are inspected; enough to decide, cheap on long blocks. */
export const MAX_LETTERS_SAMPLED = 600;

/**
 * Detect the dominant direction of a piece of text.
 *
 * @param {string | null | undefined} text
 * @param {{ threshold?: number }} [options]
 * @returns {'rtl' | 'ltr' | null} `null` when the text has no letters (numbers, emoji, punctuation).
 */
export function detectDirection(text, { threshold = DEFAULT_RTL_THRESHOLD } = {}) {
  if (!text) return null;

  let rtl = 0;
  let total = 0;

  for (const char of text) {
    if (!LETTER.test(char)) continue;
    total += 1;
    if (RTL_SCRIPT.test(char)) rtl += 1;
    if (total >= MAX_LETTERS_SAMPLED) break;
  }

  if (total === 0) return null;
  return rtl / total >= threshold ? 'rtl' : 'ltr';
}

/**
 * @param {string | null | undefined} text
 * @returns {boolean} whether the text contains at least one RTL-script character.
 */
export function containsRtl(text) {
  return Boolean(text) && RTL_SCRIPT.test(text);
}
