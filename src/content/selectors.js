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

/** Attribute that marks elements whose `dir` this extension manages. */
export const MANAGED_ATTR = 'data-crtl';
