/**
 * All knowledge about claude.ai's DOM lives here (and in content.css).
 * When Claude ships a redesign and something stops working, this is the
 * first file to update. Prefer stable hooks (data-testid, semantic tags)
 * over generated utility classes.
 */

/** Text blocks whose direction is detected individually. */
export const BLOCK_SELECTOR = [
  'p',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'table',
  'th',
  'td',
  'dt',
  'dd',
].join(', ');

/**
 * Anything inside these is never touched: code must stay LTR, and the
 * composer is a ProseMirror editor that must not have its DOM mutated
 * (its direction is handled purely with CSS, see content.css).
 */
export const SKIP_SELECTOR = [
  'pre',
  'code',
  'kbd',
  'samp',
  'textarea',
  'input',
  'svg',
  'math',
  '.katex',
  '.ProseMirror',
  '[contenteditable="true"]',
].join(', ');

/**
 * Containers of chat messages. claude.ai sets its own first-strong-character
 * `dir` on paragraphs in here (e.g. `<p dir="ltr">` for a Persian sentence that
 * starts with an English word), so inside them the page's `dir` is overridden.
 */
export const MESSAGE_ROOT_SELECTOR = [
  '[data-testid="user-message"]',
  '.font-claude-response',
  '.font-claude-message',
  '.standard-markdown',
  '.progressive-markdown',
].join(', ');

/**
 * Marks elements whose `dir` this extension manages; its value is the page's
 * original `dir` ('' if none), restored when the extension is turned off.
 */
export const MANAGED_ATTR = 'data-crtl';

/** Marks an LTR list item kept on the side of its RTL list (see content.css). */
export const LTR_ITEM_ATTR = 'data-crtl-ltr-item';
