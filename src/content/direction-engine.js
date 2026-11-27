import { detectDirection } from '../shared/direction.js';
import { BLOCK_SELECTOR, MANAGED_ATTR, SKIP_SELECTOR } from './selectors.js';

/**
 * Watches the page and sets `dir` on every text block according to its content.
 *
 * Design notes:
 * - Mutations are batched into one animation frame, so streaming responses
 *   (hundreds of characterData mutations per second) stay cheap.
 * - Only `childList` and `characterData` are observed, never attributes, so
 *   our own `dir` writes cannot cause feedback loops.
 * - We never touch elements whose `dir` was set by the page itself.
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
      });
    }
    this.processAll();
  }

  stop() {
    this.#running = false;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#pending.clear();
    for (const el of this.document.querySelectorAll(`[${MANAGED_ATTR}]`)) {
      el.removeAttribute('dir');
      el.removeAttribute(MANAGED_ATTR);
    }
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
    if (!managed && el.hasAttribute('dir')) return false; // the page owns this one

    const before = managed ? el.getAttribute('dir') : null;
    const detected = this.#mode === 'rtl' ? 'rtl' : detectDirection(el.textContent);

    let next = null;
    if (detected === 'rtl') {
      next = 'rtl';
    } else if (detected === 'ltr' && el.parentElement?.closest('[dir="rtl"]')) {
      // Inside an RTL ancestor an LTR block has to say so explicitly —
      // except list items: flipping one would move its bullet outside the
      // list. They keep the list's side; content.css fixes their bidi.
      next = isItemOfRtlList(el) ? null : 'ltr';
    }

    if (next === before) return false;

    if (next) {
      el.setAttribute('dir', next);
      el.setAttribute(MANAGED_ATTR, '');
    } else {
      el.removeAttribute('dir');
      el.removeAttribute(MANAGED_ATTR);
    }
    return true;
  }
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
