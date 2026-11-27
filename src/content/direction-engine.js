import { detectDirection } from '../shared/direction.js';
import {
  BLOCK_SELECTOR,
  LTR_ITEM_ATTR,
  MANAGED_ATTR,
  MESSAGE_ROOT_SELECTOR,
  SKIP_SELECTOR,
} from './selectors.js';

/**
 * Watches the page and sets `dir` on every text block according to its content.
 *
 * Design notes:
 * - Mutations are batched into one animation frame, so streaming responses
 *   (hundreds of characterData mutations per second) stay cheap.
 * - `dir` attribute changes are observed too, because claude.ai sets its own
 *   (first-strong-character) `dir` on message paragraphs and may rewrite it
 *   while streaming. Applying is idempotent, so our own writes settle after
 *   one extra no-op pass instead of looping.
 * - Inside chat messages the page's `dir` is only a guess and is overridden;
 *   elsewhere only `dir="auto"` is. The original value is kept in
 *   MANAGED_ATTR and restored on stop().
 */
export class DirectionEngine {
  /** @type {Set<Element>} */
  #pending = new Set();
  #scheduled = false;
  #running = false;
  /** @type {MutationObserver | null} */
  #observer = null;
  /** @type {'auto' | 'rtl'} */
  #mode = 'auto';

  /**
   * @param {object} [options]
   * @param {Document} [options.document]
   * @param {(cb: () => void) => void} [options.schedule]  Defaults to requestAnimationFrame.
   */
  constructor({ document: doc = globalThis.document, schedule } = {}) {
    this.document = doc;
    this.schedule =
      schedule ??
      ((cb) => {
        // rAF is paused in background tabs; fall back so hidden tabs still update.
        if (doc.visibilityState === 'hidden') setTimeout(cb, 100);
        else requestAnimationFrame(cb);
      });
  }

  get running() {
    return this.#running;
  }

  /** @param {'auto' | 'rtl'} mode */
  start(mode = 'auto') {
    this.#mode = mode;
    if (!this.#running) {
      this.#running = true;
      this.#observer = new MutationObserver((records) => this.#onMutations(records));
      this.#observer.observe(this.document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['dir'],
      });
    }
    this.processAll();
  }

  stop() {
    this.#running = false;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#pending.clear();
    for (const el of this.document.querySelectorAll(`[${MANAGED_ATTR}]`)) restore(el);
  }

  /** @param {'auto' | 'rtl'} mode */
  setMode(mode) {
    if (mode === this.#mode) return;
    this.#mode = mode;
    if (this.#running) this.processAll();
  }

  /** Re-evaluate every block on the page. */
  processAll() {
    for (const el of this.document.querySelectorAll(BLOCK_SELECTOR)) this.#pending.add(el);
    this.flush();
  }

  /** Process queued blocks synchronously (exposed for tests). */
  flush() {
    this.#scheduled = false;
    if (!this.#running || this.#pending.size === 0) return;

    // Parents first, so children can see their ancestor's final direction.
    const queue = [...this.#pending]
      .filter((el) => el.isConnected)
      .sort((a, b) => depth(a) - depth(b));
    this.#pending.clear();

    for (const el of queue) {
      if (this.#apply(el)) {
        // Direction flipped: descendants that inherit may now need an explicit dir.
        for (const child of el.querySelectorAll(BLOCK_SELECTOR)) this.#apply(child);
      }
    }
  }

  /** @param {MutationRecord[]} records */
  #onMutations(records) {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target) this.#enqueueWithAncestors(/** @type {Element} */ (target));

      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const el = /** @type {Element} */ (node);
        if (el.matches(BLOCK_SELECTOR)) this.#pending.add(el);
        for (const block of el.querySelectorAll(BLOCK_SELECTOR)) this.#pending.add(block);
      }
    }

    if (this.#pending.size > 0 && !this.#scheduled) {
      this.#scheduled = true;
      this.schedule(() => this.flush());
    }
  }

  /** A text change inside an <li> can change the direction of its <ul>, too. */
  #enqueueWithAncestors(el) {
    let block = el.closest(BLOCK_SELECTOR);
    while (block) {
      this.#pending.add(block);
      block = block.parentElement?.closest(BLOCK_SELECTOR) ?? null;
    }
  }

  /**
   * @param {Element} el
   * @returns {boolean} whether the effective direction changed.
   */
  #apply(el) {
    if (el.closest(SKIP_SELECTOR)) return false;

    const managed = el.hasAttribute(MANAGED_ATTR);
    const original = managed ? el.getAttribute(MANAGED_ATTR) : (el.getAttribute('dir') ?? '');
    if (!managed && !isOverridable(el, original)) return false;

    const detected = this.#mode === 'rtl' ? 'rtl' : detectDirection(el.textContent);

    /** @type {string | null} */
    let next = null;
    if (detected === 'rtl') {
      next = 'rtl';
    } else if (isItemOfRtlList(el)) {
      // An LTR item keeps its list's side, otherwise its bullet would jump
      // outside the list. It is flagged so content.css can order its
      // punctuation as LTR text (unicode-bidi: plaintext).
      next = detected === 'ltr' || original ? 'rtl' : null;
    } else if (detected === 'ltr' && (original || el.parentElement?.closest('[dir="rtl"]'))) {
      // Replacing a page value, or inside an RTL ancestor: LTR must be explicit.
      next = 'ltr';
    }

    // Only ever true while we manage the element, so restore() can drop it.
    el.toggleAttribute(LTR_ITEM_ATTR, next !== null && detected === 'ltr' && isItemOfRtlList(el));

    const current = el.getAttribute('dir');
    const target = next ?? (original || null);
    if (target === current) return false;

    if (next) {
      el.setAttribute('dir', next);
      el.setAttribute(MANAGED_ATTR, original);
    } else {
      restore(el);
    }
    return true;
  }
}

/** Put back whatever `dir` the page had before we touched the element. */
function restore(el) {
  const original = el.getAttribute(MANAGED_ATTR);
  if (original) el.setAttribute('dir', original);
  else el.removeAttribute('dir');
  el.removeAttribute(MANAGED_ATTR);
  el.removeAttribute(LTR_ITEM_ATTR);
}

/**
 * Whether we may replace the `dir` the page put on an element.
 * @param {Element} el
 * @param {string} pageDir  '' when the element has no `dir`.
 */
function isOverridable(el, pageDir) {
  return pageDir === '' || pageDir === 'auto' || el.closest(MESSAGE_ROOT_SELECTOR) !== null;
}

/** @param {Element} el */
function isItemOfRtlList(el) {
  const parent = el.parentElement;
  return (
    el.tagName === 'LI' &&
    parent !== null &&
    (parent.tagName === 'UL' || parent.tagName === 'OL') &&
    parent.getAttribute('dir') === 'rtl'
  );
}

function depth(el) {
  let d = 0;
  for (let node = el.parentElement; node; node = node.parentElement) d += 1;
  return d;
}
